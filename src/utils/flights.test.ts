import { describe, expect, it } from 'vitest';
import { UserProfile } from '../types';
import { getProfileFlights, normalizeProfileAirports } from './flights';

const profileWithIcaoAirports: UserProfile = {
  uid: 'test-user',
  nickname: 'Test',
  email: 'test@example.com',
  base: 'CYUL',
  position: 'PNC',
  webcal: 'webcal://example.test/roster.ics',
  flights: [
    {
      origin: 'CYUL',
      destination: 'LFPO',
      flightNumber: 'BF730',
      startDate: '2026-06-15T08:00:00Z',
      endDate: '2026-06-15T15:00:00Z',
    },
  ],
  rotations: [
    {
      startDate: '2026-06-15T08:00:00Z',
      endDate: new Date('2026-06-15T15:00:00Z'),
      flights: [
        {
          origin: 'LFPO',
          destination: 'CYUL',
          flightNumber: 'BF731',
          startDate: '2026-06-16T08:00:00Z',
          endDate: '2026-06-16T15:00:00Z',
        },
      ],
    },
  ],
};

describe('flights', () => {
  it('normalizes cached profile airport codes', () => {
    const normalized = normalizeProfileAirports(profileWithIcaoAirports);

    expect(normalized.base).toBe('YUL');
    expect(normalized.flights?.[0].origin).toBe('YUL');
    expect(normalized.flights?.[0].destination).toBe('ORY');
    expect(normalized.rotations?.[0].flights[0].origin).toBe('ORY');
    expect(normalized.rotations?.[0].flights[0].destination).toBe('YUL');
  });

  it('returns display flights with IATA airport codes', () => {
    expect(getProfileFlights(profileWithIcaoAirports)).toMatchObject([
      {
        origin: 'YUL',
        destination: 'ORY',
      },
    ]);
  });
});
