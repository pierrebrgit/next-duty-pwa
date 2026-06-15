import { describe, expect, it } from 'vitest';
import { getDaysInMonth, isRosterdayThisDay, isWeekendThisDay } from './rosterUtils';

describe('rosterUtils', () => {
  it('returns the number of days in a month', () => {
    expect(getDaysInMonth(2024, 1)).toBe(29);
    expect(getDaysInMonth(2025, 1)).toBe(28);
    expect(getDaysInMonth(2025, 6)).toBe(31);
  });

  it('identifies the roster publication day for each month length', () => {
    expect(isRosterdayThisDay(14, 1, 2025)).toBe(true);
    expect(isRosterdayThisDay(15, 1, 2024)).toBe(true);
    expect(isRosterdayThisDay(16, 3, 2025)).toBe(true);
    expect(isRosterdayThisDay(17, 6, 2025)).toBe(true);
    expect(isRosterdayThisDay(18, 6, 2025)).toBe(false);
  });

  it('identifies weekends', () => {
    expect(isWeekendThisDay(15, 5, 2025)).toBe(true);
    expect(isWeekendThisDay(16, 5, 2025)).toBe(false);
  });
});
