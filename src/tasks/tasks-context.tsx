/**
 * Shares the task list with every screen.
 *
 * Screens call `useTasks()` to read tasks and to add/edit/complete/delete them.
 * Every change is saved to the device automatically (see storage.ts).
 *
 * Changes are only allowed (and only saved) once the saved list has loaded successfully.
 * If loading fails, we leave the device data alone so it can't be overwritten.
 */
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';

import { loadTasks, saveTasks } from '@/tasks/storage';
import type { Task, TaskInput } from '@/tasks/types';

export type LoadStatus = 'loading' | 'ready' | 'error';

type TasksContextValue = {
  tasks: Task[];
  /** 'loading' until saved tasks have been read, then 'ready' — or 'error' if reading failed. */
  loadStatus: LoadStatus;
  /** Try reading saved tasks again after an error. */
  retryLoad: () => void;
  addTask: (input: TaskInput) => void;
  updateTask: (id: string, input: TaskInput) => void;
  setCompleted: (id: string, completed: boolean) => void;
  deleteTask: (id: string) => void;
};

const TasksContext = createContext<TasksContextValue | null>(null);

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');

  const load = useCallback(() => {
    loadTasks()
      .then((loaded) => {
        setTasks(loaded);
        setLoadStatus('ready');
      })
      .catch((error) => {
        console.error('Failed to load tasks', error);
        setLoadStatus('error');
      });
  }, []);

  // Read saved tasks once when the app starts.
  useEffect(load, [load]);

  function retryLoad() {
    setLoadStatus('loading');
    load();
  }

  // Save whenever the list changes — but only after a successful load, otherwise we
  // would overwrite the saved list with an empty one.
  useEffect(() => {
    if (loadStatus !== 'ready') return;
    saveTasks(tasks).catch((error) => console.error('Failed to save tasks', error));
  }, [tasks, loadStatus]);

  /** Applies a change to the list, but only when it is safe to save it. */
  function change(update: (current: Task[]) => Task[]) {
    if (loadStatus !== 'ready') return;
    setTasks(update);
  }

  function addTask(input: TaskInput) {
    const task: Task = {
      id: createId(),
      title: input.title,
      dueAt: input.dueAt,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    change((current) => [...current, task]);
  }

  function updateTask(id: string, input: TaskInput) {
    change((current) => current.map((task) => (task.id === id ? { ...task, ...input } : task)));
  }

  function setCompleted(id: string, completed: boolean) {
    const completedAt = completed ? new Date().toISOString() : null;
    change((current) => current.map((task) => (task.id === id ? { ...task, completedAt } : task)));
  }

  function deleteTask(id: string) {
    change((current) => current.filter((task) => task.id !== id));
  }

  return (
    <TasksContext
      value={{
        tasks,
        loadStatus,
        retryLoad,
        addTask,
        updateTask,
        setCompleted,
        deleteTask,
      }}>
      {children}
    </TasksContext>
  );
}

export function useTasks() {
  const context = use(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used inside <TasksProvider>');
  }
  return context;
}
