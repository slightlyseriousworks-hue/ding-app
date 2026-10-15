import { router } from 'expo-router';
import { SectionList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TaskRow } from '@/components/task-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { addDays, isSameDay, startOfDay } from '@/tasks/dates';
import { useTasks } from '@/tasks/tasks-context';
import type { Task } from '@/tasks/types';

type Section = { title: string; data: Task[] };

/** Splits tasks into the sections shown on the Today screen. Empty sections are left out. */
function groupTasks(tasks: Task[], now: Date): Section[] {
  const tomorrow = startOfDay(addDays(now, 1));
  const byDueDate = [...tasks].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const open = byDueDate.filter((task) => task.completedAt === null);

  const sections: Section[] = [
    { title: 'Overdue', data: open.filter((task) => new Date(task.dueAt) < now) },
    {
      title: 'Today',
      data: open.filter((task) => {
        const due = new Date(task.dueAt);
        return due >= now && due < tomorrow;
      }),
    },
    { title: 'Upcoming', data: open.filter((task) => new Date(task.dueAt) >= tomorrow) },
    {
      title: 'Done today',
      data: byDueDate.filter(
        (task) => task.completedAt !== null && isSameDay(new Date(task.completedAt), now)
      ),
    },
  ];

  return sections.filter((section) => section.data.length > 0);
}

export default function TodayScreen() {
  const { tasks, isLoaded, setCompleted } = useTasks();
  const now = useNow();
  const sections = groupTasks(tasks, now);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        {isLoaded && (
          <SectionList
            sections={sections}
            keyExtractor={(task) => task.id}
            contentContainerStyle={styles.list}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                {section.title}
              </ThemedText>
            )}
            renderItem={({ item }) => (
              <TaskRow
                task={item}
                now={now}
                onToggleComplete={() => setCompleted(item.id, item.completedAt === null)}
              />
            )}
            ListEmptyComponent={
              <ThemedView style={styles.empty}>
                <ThemedText type="subtitle">All clear</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                  Add a task and Ding will make sure you don&apos;t forget it.
                </ThemedText>
              </ThemedView>
            }
          />
        )}
        <ThemedView style={styles.footer}>
          <Button label="+ New task" onPress={() => router.push('/task/new')} />
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  list: {
    flexGrow: 1,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  sectionTitle: {
    marginTop: Spacing.three,
    textTransform: 'uppercase',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  emptyText: {
    textAlign: 'center',
  },
  footer: {
    padding: Spacing.three,
  },
});
