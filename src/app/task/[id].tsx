import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TaskForm } from '@/components/task-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDue } from '@/tasks/dates';
import { useTasks } from '@/tasks/tasks-context';
import { confirm } from '@/utils/confirm';

function goBack() {
  // If this screen was opened directly (e.g. a web URL) there is nothing to go back to.
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function TaskDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tasks, isLoaded, updateTask, setCompleted, deleteTask } = useTasks();
  const task = tasks.find((t) => t.id === id);

  if (!isLoaded) {
    return <ThemedView style={styles.fill} />;
  }

  if (!task) {
    return (
      <ThemedView style={[styles.fill, styles.notFound]}>
        <ThemedText themeColor="textSecondary">This task no longer exists.</ThemedText>
        <Button label="Back to Today" variant="secondary" onPress={() => router.replace('/')} />
      </ThemedView>
    );
  }

  const isDone = task.completedAt !== null;

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete task?',
      message: `"${task.title}" will be removed for good.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    // Leave the screen first so it doesn't flash "no longer exists".
    goBack();
    deleteTask(task.id);
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      {task.completedAt !== null && (
        <ThemedText type="smallBold" style={{ color: theme.textSecondary }}>
          ✓ Done {formatDue(task.completedAt)}
        </ThemedText>
      )}

      {/* `key` resets the form if a different task is shown. */}
      <TaskForm
        key={task.id}
        initialValue={{ title: task.title, dueAt: task.dueAt }}
        submitLabel="Save changes"
        onSubmit={(input) => {
          updateTask(task.id, input);
          goBack();
        }}
      />

      <View style={styles.actions}>
        <Button
          label={isDone ? 'Mark as not done' : 'Mark as done'}
          variant="secondary"
          onPress={() => setCompleted(task.id, !isDone)}
        />
        <Button label="Delete task" variant="danger" onPress={handleDelete} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  notFound: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  content: {
    gap: Spacing.four,
    padding: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  actions: {
    gap: Spacing.two,
  },
});
