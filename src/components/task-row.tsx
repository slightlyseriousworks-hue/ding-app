import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDue } from '@/tasks/dates';
import type { Task } from '@/tasks/types';

type TaskRowProps = {
  task: Task;
  now: Date;
  onToggleComplete: () => void;
};

export function TaskRow({ task, now, onToggleComplete }: TaskRowProps) {
  const theme = useTheme();
  const isDone = task.completedAt !== null;
  const isOverdue = !isDone && new Date(task.dueAt) < now;

  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      {/* The checkbox and the title are separate buttons so tapping one never triggers the other. */}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isDone }}
        accessibilityLabel={isDone ? 'Mark as not done' : 'Mark as done'}
        hitSlop={Spacing.two}
        onPress={onToggleComplete}
        style={[
          styles.checkbox,
          { borderColor: isDone ? theme.accent : theme.textSecondary },
          isDone && { backgroundColor: theme.accent },
        ]}>
        {isDone && (
          <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
            ✓
          </ThemedText>
        )}
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
        onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}>
        <ThemedText
          numberOfLines={2}
          themeColor={isDone ? 'textSecondary' : 'text'}
          style={isDone && styles.doneTitle}>
          {task.title}
        </ThemedText>
        <ThemedText type="small" style={{ color: isOverdue ? theme.danger : theme.textSecondary }}>
          {formatDue(task.dueAt, now)}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingLeft: Spacing.three,
    borderRadius: Spacing.three,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingVertical: Spacing.three,
    paddingRight: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
  doneTitle: {
    textDecorationLine: 'line-through',
  },
});
