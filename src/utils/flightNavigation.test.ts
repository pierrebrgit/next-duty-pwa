import { describe, expect, it } from 'vitest';
import { Flight } from '../types';
import { getNextDutyIndex } from './flightNavigation';

const flight = (startDate: string, endDate: string): Flight => ({
  origin: 'ORY',
  destination: 'RUN',
  flightNumber: '710',
  startDate,
  endDate,
});

describe('flightNavigation', () => {
  it('returns the first active or future duty', () => {
    const flights = [
      flight('2026-06-01T08:00:00Z', '2026-06-01T18:00:00Z'),
      flight('2026-06-15T08:00:00Z', '2026-06-15T18:00:00Z'),
      flight('2026-06-20T08:00:00Z', '2026-06-20T18:00:00Z'),
    ];

    expect(getNextDutyIndex(flights, new Date('2026-06-15T10:00:00Z'))).toBe(1);
  });

  it('falls back to the latest duty when all duties are completed', () => {
    const flights = [
      flight('2026-06-01T08:00:00Z', '2026-06-01T18:00:00Z'),
      flight('2026-06-02T08:00:00Z', '2026-06-02T18:00:00Z'),
    ];

    expect(getNextDutyIndex(flights, new Date('2026-06-15T10:00:00Z'))).toBe(1);
  });

  it('handles an empty roster', () => {
    expect(getNextDutyIndex([], new Date('2026-06-15T10:00:00Z'))).toBe(0);
  });
});
