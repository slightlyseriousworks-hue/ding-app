import { fireEvent, render, screen } from '@testing-library/react-native';

import { TaskForm } from '@/components/task-form';
import type { TaskInput } from '@/tasks/types';

// theme.ts imports a stylesheet (for web), which Jest can't read. The form doesn't need it.
jest.mock('@/global.css', () => ({}));

// 11:08:37.512 local time — deliberately not on a whole minute.
const NOW = new Date(2026, 9, 16, 11, 8, 37, 512);

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
});

afterEach(() => {
  jest.useRealTimers();
});

/** Renders the form, presses `labels` in order, then Save. Returns the saved due time. */
async function saveAfterPressing(labels: string[], initialValue?: TaskInput) {
  const onSubmit = jest.fn();
  await render(<TaskForm initialValue={initialValue} submitLabel="Save" onSubmit={onSubmit} />);
  if (!initialValue) await fireEvent.changeText(screen.getByPlaceholderText(/What do you/), 'Test');
  for (const label of labels) {
    await fireEvent.press(screen.getByText(label));
  }
  await fireEvent.press(screen.getByText('Save'));
  expect(onSubmit).toHaveBeenCalledTimes(1);
  return new Date((onSubmit.mock.calls[0][0] as TaskInput).dueAt);
}

function expectWholeMinute(date: Date) {
  expect(date.getSeconds()).toBe(0);
  expect(date.getMilliseconds()).toBe(0);
}

/** Presses a stepper arrow, found by its accessibility label (e.g. "Later time"). */
async function pressStepper(label: string) {
  await fireEvent.press(screen.getByLabelText(label));
}

it('DEV +1 min saves the first whole minute at least a minute away', async () => {
  const due = await saveAfterPressing(['DEV +1 min']);
  expect(due).toEqual(new Date(2026, 9, 16, 11, 10, 0, 0));
});

it('DEV +2 min saves a whole minute', async () => {
  expect(await saveAfterPressing(['DEV +2 min'])).toEqual(new Date(2026, 9, 16, 11, 11, 0, 0));
});

it('DEV +5 min saves a whole minute', async () => {
  expect(await saveAfterPressing(['DEV +5 min'])).toEqual(new Date(2026, 9, 16, 11, 14, 0, 0));
});

it('"In 1 hour" saves the minute shown, with no hidden seconds', async () => {
  const due = await saveAfterPressing(['In 1 hour']);
  expect(due).toEqual(new Date(2026, 9, 16, 12, 8, 0, 0));
});

it('the default (next full hour) is a whole minute', async () => {
  expectWholeMinute(await saveAfterPressing([]));
});

it('the 15-minute time stepper lands exactly on the grid', async () => {
  const onSubmit = jest.fn();
  await render(<TaskForm submitLabel="Save" onSubmit={onSubmit} />);
  await fireEvent.changeText(screen.getByPlaceholderText(/What do you/), 'Test');
  await fireEvent.press(screen.getByText('DEV +1 min')); // 11:10:00
  await pressStepper('Later time'); // → 11:15
  await pressStepper('Later time'); // → 11:30
  await pressStepper('Earlier time'); // → 11:15
  await fireEvent.press(screen.getByText('Save'));
  expect(new Date(onSubmit.mock.calls[0][0].dueAt)).toEqual(new Date(2026, 9, 16, 11, 15, 0, 0));
});

it('editing a task saved with hidden seconds stores a whole minute', async () => {
  const legacy = { title: 'Old task', dueAt: new Date(2026, 9, 16, 15, 0, 42, 123).toISOString() };
  const onSubmit = jest.fn();
  await render(<TaskForm initialValue={legacy} submitLabel="Save" onSubmit={onSubmit} />);
  await pressStepper('Later day');
  await fireEvent.press(screen.getByText('Save'));
  expect(new Date(onSubmit.mock.calls[0][0].dueAt)).toEqual(new Date(2026, 9, 17, 15, 0, 0, 0));
});
