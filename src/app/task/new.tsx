import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { TaskForm } from '@/components/task-form';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { prepareReminder, showRemindersOffMessage } from '@/reminders/reminder-permission';
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
        onSubmit={async (input) => {
          // Ask for notification permission before saving, so the reminder can be scheduled
          // straight away. The task is saved whatever the answer.
          const canRemind = await prepareReminder(input.dueAt);
          addTask(input);
          // If this screen was opened directly (e.g. a web URL) there is nothing to go back to.
          if (router.canGoBack()) router.back();
          else router.replace('/');
          if (!canRemind) showRemindersOffMessage();
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
