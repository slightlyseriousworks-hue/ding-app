import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { TaskForm } from '@/components/task-form';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTasks } from '@/tasks/tasks-context';

export default function NewTaskScreen() {
  const theme = useTheme();
  const { addTask } = useTasks();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <TaskForm
        autoFocus
        submitLabel="Add task"
        onSubmit={(input) => {
          addTask(input);
          // If this screen was opened directly (e.g. a web URL) there is nothing to go back to.
          if (router.canGoBack()) router.back();
          else router.replace('/');
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
