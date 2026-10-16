import {
  addDays,
  formatDay,
  isSameDay,
  startOfDay,
  startOfMinute,
  wholeMinutesFromNow,
} from '@/tasks/dates';

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

describe('startOfMinute', () => {
  it('drops seconds and milliseconds without changing the input', () => {
    const withSeconds = new Date(2026, 9, 16, 11, 8, 37, 512);
    expect(startOfMinute(withSeconds)).toEqual(new Date(2026, 9, 16, 11, 8, 0, 0));
    expect(withSeconds.getSeconds()).toBe(37);
  });
});

describe('wholeMinutesFromNow', () => {
  it('rounds up to the next whole minute, so there is always at least that much lead', () => {
    const at = new Date(2026, 9, 16, 11, 8, 20, 500);
    expect(wholeMinutesFromNow(1, at)).toEqual(new Date(2026, 9, 16, 11, 10, 0, 0));
    expect(wholeMinutesFromNow(5, at)).toEqual(new Date(2026, 9, 16, 11, 14, 0, 0));
  });

  it('keeps an exact minute as it is', () => {
    const at = new Date(2026, 9, 16, 11, 8, 0, 0);
    expect(wholeMinutesFromNow(1, at)).toEqual(new Date(2026, 9, 16, 11, 9, 0, 0));
  });

  it('rounds up even 1 millisecond past the minute', () => {
    const at = new Date(2026, 9, 16, 11, 8, 0, 1);
    expect(wholeMinutesFromNow(1, at)).toEqual(new Date(2026, 9, 16, 11, 10, 0, 0));
  });
});
