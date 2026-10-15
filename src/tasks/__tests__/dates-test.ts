import { addDays, formatDay, isSameDay, startOfDay } from '@/tasks/dates';

// Dates are built with local-time constructors (month is 0-based: 9 = October),
// so these tests pass in any timezone.
const now = new Date(2026, 9, 16, 14, 30);

describe('startOfDay', () => {
  it('returns midnight of the same day without changing the input', () => {
    const result = startOfDay(now);
    expect(result).toEqual(new Date(2026, 9, 16, 0, 0, 0, 0));
    expect(now).toEqual(new Date(2026, 9, 16, 14, 30));
  });
});

describe('addDays', () => {
  it('adds and subtracts days', () => {
    expect(addDays(now, 1)).toEqual(new Date(2026, 9, 17, 14, 30));
    expect(addDays(now, -1)).toEqual(new Date(2026, 9, 15, 14, 30));
  });

  it('rolls over into the next month and year', () => {
    expect(addDays(new Date(2026, 9, 31), 1)).toEqual(new Date(2026, 10, 1));
    expect(addDays(new Date(2026, 11, 31), 1)).toEqual(new Date(2027, 0, 1));
  });
});

describe('isSameDay', () => {
  it('ignores the time of day', () => {
    expect(isSameDay(new Date(2026, 9, 16, 0, 0), new Date(2026, 9, 16, 23, 59))).toBe(true);
  });

  it('tells different days apart', () => {
    expect(isSameDay(new Date(2026, 9, 16, 23, 59), new Date(2026, 9, 17, 0, 0))).toBe(false);
  });
});

describe('formatDay', () => {
  it('uses friendly names for nearby days', () => {
    expect(formatDay(new Date(2026, 9, 16, 8, 0), now)).toBe('Today');
    expect(formatDay(new Date(2026, 9, 17, 23, 0), now)).toBe('Tomorrow');
    expect(formatDay(new Date(2026, 9, 15, 1, 0), now)).toBe('Yesterday');
  });

  it('falls back to a date for other days', () => {
    const label = formatDay(new Date(2026, 9, 20), now);
    expect(label).not.toMatch(/Today|Tomorrow|Yesterday/);
  });
});
