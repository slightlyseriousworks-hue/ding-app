/**
 * Shares the task list with every screen.
 *
 * Screens call `useTasks()` to read tasks and to add/edit/complete/delete them.
 * Every change is saved to the device automatically (see storage.ts).
 */
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { loadTasks, saveTasks } from '@/tasks/storage';
import type { Task, TaskInput } from '@/tasks/types';

type TasksContextValue = {
  tasks: Task[];
  /** False until saved tasks have been read from the device. */
  isLoaded: boolean;
  addTask: (input: TaskInput) => Task;
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
  const [isLoaded, setIsLoaded] = useState(false);

  // Read saved tasks once when the app starts.
  useEffect(() => {
    loadTasks()
      .then(setTasks)
      .catch((error) => console.error('Failed to load tasks', error))
      .finally(() => setIsLoaded(true));
  }, []);

  // Save whenever the list changes (but not before the saved list has been loaded,
  // otherwise we would overwrite it with an empty list).
  useEffect(() => {
    if (!isLoaded) return;
    saveTasks(tasks).catch((error) => console.error('Failed to save tasks', error));
  }, [tasks, isLoaded]);

  function addTask(input: TaskInput) {
    const task: Task = {
      id: createId(),
      title: input.title,
      dueAt: input.dueAt,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    setTasks((current) => [...current, task]);
    return task;
  }

  function updateTask(id: string, input: TaskInput) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, ...input } : task))
    );
  }

  function setCompleted(id: string, completed: boolean) {
    const completedAt = completed ? new Date().toISOString() : null;
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, completedAt } : task))
    );
  }

  function deleteTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  return (
    <TasksContext
      value={{ tasks, isLoaded, addTask, updateTask, setCompleted, deleteTask }}>
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
