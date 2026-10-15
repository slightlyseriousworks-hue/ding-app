import { router } from 'expo-router';
import { SectionList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TaskRow } from '@/components/task-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { groupTasks } from '@/tasks/grouping';
import { useTasks } from '@/tasks/tasks-context';

export default function TodayScreen() {
  const { tasks, loadStatus, retryLoad, setCompleted } = useTasks();
  const now = useNow();
  const sections = groupTasks(tasks, now);

  if (loadStatus === 'error') {
    return (
      <ThemedView style={[styles.container, styles.empty]}>
        <ThemedText type="subtitle">Couldn&apos;t load your tasks</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.emptyText}>
          Your saved tasks are untouched. Try again, or restart the app.
        </ThemedText>
        <Button label="Try again" variant="secondary" onPress={retryLoad} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        {loadStatus === 'ready' && (
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
