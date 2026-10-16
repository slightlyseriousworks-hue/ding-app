/**
 * The task form, shared by Create Task and Task Detail.
 *
 * Date/time uses simple presets + steppers so it behaves the same on iOS, Android, and web
 * without extra dependencies. It can be swapped for a native picker later.
 */
import { useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDay, formatTime, startOfDay } from '@/tasks/dates';
import type { TaskInput } from '@/tasks/types';

const TIME_STEP_MINUTES = 15;

type TaskFormProps = {
  initialValue?: TaskInput;
  submitLabel: string;
  /** May be async; the button stays disabled until it finishes, so a task can't save twice. */
  onSubmit: (input: TaskInput) => void | Promise<void>;
  autoFocus?: boolean;
};

/** The next full hour, e.g. 3:20 PM → 4:00 PM. */
function nextFullHour(now: Date) {
  const result = new Date(now);
  result.setHours(result.getHours() + 1, 0, 0, 0);
  return result;
}

function atTime(day: Date, hours: number, minutes = 0) {
  const result = startOfDay(day);
  result.setHours(hours, minutes);
  return result;
}

export function TaskForm({ initialValue, submitLabel, onSubmit, autoFocus }: TaskFormProps) {
  const theme = useTheme();
  const titleInputRef = useRef<TextInput>(null);
  const [title, setTitle] = useState(initialValue?.title ?? '');
  const [due, setDue] = useState(() =>
    initialValue ? new Date(initialValue.dueAt) : nextFullHour(new Date())
  );

  const [isBeforeEvening] = useState(() => new Date().getHours() < 18);

  const [isSubmitting, setIsSubmitting] = useState(false);
  // A ref (not just state) so a fast double tap is blocked before the next render.
  const isSubmittingRef = useRef(false);

  const trimmedTitle = title.trim();

  async function handleSubmit() {
    if (!trimmedTitle || isSubmittingRef.current) return;
    // Hide the keyboard right away instead of waiting for the screen to close.
    titleInputRef.current?.blur();
    Keyboard.dismiss();
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onSubmit({ title: trimmedTitle, dueAt: due.toISOString() });
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  // Each preset works out its time when tapped, so it is never stale.
  const presets = [
    { label: 'In 1 hour', getDate: () => new Date(Date.now() + 60 * 60 * 1000) },
    { label: 'This evening', getDate: () => atTime(new Date(), 18) },
    { label: 'Tomorrow morning', getDate: () => atTime(addDays(new Date(), 1), 9) },
    // Dev-only: short due times for testing reminders by hand. `__DEV__` is false in
    // production builds, so these chips never ship to users.
    ...(__DEV__
      ? [1, 2, 5].map((minutes) => ({
          label: `DEV +${minutes} min`,
          getDate: () => new Date(Date.now() + minutes * 60 * 1000),
        }))
      : []),
  ].filter((preset) => preset.label !== 'This evening' || isBeforeEvening);

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Task
        </ThemedText>
        <TextInput
          ref={titleInputRef}
          value={title}
          onChangeText={setTitle}
          placeholder="What do you need to do?"
          placeholderTextColor={theme.textSecondary}
          autoFocus={autoFocus}
          maxLength={200}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          style={[
            styles.input,
            { color: theme.text, backgroundColor: theme.backgroundElement },
          ]}
        />
      </View>

      <View style={styles.field}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          When
        </ThemedText>
        <View style={styles.presets}>
          {presets.map((preset) => (
            <Pressable
              key={preset.label}
              accessibilityRole="button"
              onPress={() => setDue(preset.getDate())}
              style={({ pressed }) => [
                styles.chip,
                { borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small">{preset.label}</ThemedText>
            </Pressable>
          ))}
        </View>
        <Stepper
          label="day"
          value={formatDay(due)}
          onDecrement={() => setDue((current) => addDays(current, -1))}
          onIncrement={() => setDue((current) => addDays(current, 1))}
        />
        <Stepper
          label="time"
          value={formatTime(due)}
          onDecrement={() => setDue((current) => shiftMinutes(current, -TIME_STEP_MINUTES))}
          onIncrement={() => setDue((current) => shiftMinutes(current, TIME_STEP_MINUTES))}
        />
      </View>

      <Button label={submitLabel} disabled={!trimmedTitle || isSubmitting} onPress={handleSubmit} />
    </View>
  );
}

/** Moves a time by `minutes`, snapping to the 15-minute grid (e.g. 3:07 + 15 → 3:15). */
function shiftMinutes(date: Date, minutes: number) {
  const stepMs = TIME_STEP_MINUTES * 60 * 1000;
  const snapped = minutes > 0
    ? Math.floor(date.getTime() / stepMs) * stepMs
    : Math.ceil(date.getTime() / stepMs) * stepMs;
  return new Date(snapped + minutes * 60 * 1000);
}

type StepperProps = {
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
};

function Stepper({ label, value, onDecrement, onIncrement }: StepperProps) {
  const theme = useTheme();

  return (
    <View style={[styles.stepper, { backgroundColor: theme.backgroundElement }]}>
      <StepperButton symbol="‹" accessibilityLabel={`Earlier ${label}`} onPress={onDecrement} />
      <ThemedText style={styles.stepperValue}>{value}</ThemedText>
      <StepperButton symbol="›" accessibilityLabel={`Later ${label}`} onPress={onIncrement} />
    </View>
  );
}

function StepperButton({
  symbol,
  accessibilityLabel,
  onPress,
}: {
  symbol: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}>
      <ThemedText type="subtitle">{symbol}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.four,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 16,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
    borderWidth: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
  },
  stepperButton: {
    width: 56,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    flex: 1,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
