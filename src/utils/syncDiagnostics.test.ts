import { describe, expect, it } from 'vitest';
import { Roster, SyncMetadata, UserProfile } from '../types';
import { buildSyncMetadata, formatSyncDiagnostic } from './syncDiagnostics';

const roster: Roster = {
  base: 'ORY',
  flights: [
    {
      origin: 'ORY',
      destination: 'JIB',
      flightNumber: '710',
      startDate: '2026-06-15T08:00:00Z',
      endDate: '2026-06-15T15:00:00Z',
    },
    {
      origin: 'JIB',
      destination: 'ORY',
      flightNumber: '711',
      startDate: '2026-06-17T08:00:00Z',
      endDate: '2026-06-17T15:00:00Z',
    },
  ],
  rotations: [
    {
      startDate: '2026-06-15T08:00:00Z',
      endDate: new Date('2026-06-17T15:00:00Z'),
      complete: true,
      flights: [
        {
          origin: 'ORY',
          destination: 'JIB',
          flightNumber: '710',
          startDate: '2026-06-15T08:00:00Z',
          endDate: '2026-06-15T15:00:00Z',
        },
        {
          origin: 'JIB',
          destination: 'ORY',
          flightNumber: '711',
          startDate: '2026-06-17T08:00:00Z',
          endDate: '2026-06-17T15:00:00Z',
        },
      ],
    },
  ],
  unmatchedFlights: [
    {
      origin: 'ORY',
      destination: 'CHR',
      flightNumber: '720',
      startDate: '2026-06-20T08:00:00Z',
      endDate: '2026-06-20T09:00:00Z',
    },
  ],
};

const profile: UserProfile = {
  uid: 'local-user',
  email: 'local@user.com',
  nickname: 'Pierre',
  base: 'ORY',
  position: 'Flight crew',
  webcal: 'webcal://cyberjet.frenchbee.com/CrewAccessICS/CrewICS?ics=SECRET',
};

describe('syncDiagnostics', () => {
  it('builds roster sync metadata', () => {
    expect(buildSyncMetadata(roster)).toEqual({
      base: 'ORY',
      flightCount: 2,
      ungroupedFlightCount: 1,
      parserGroupCount: 1,
      periodStart: '2026-06-15T08:00:00.000Z',
      periodEnd: '2026-06-17T15:00:00.000Z',
    });
  });

  it('copies only the calendar host in diagnostics', () => {
    const metadata: SyncMetadata = {
      ...buildSyncMetadata(roster),
      syncedAt: '2026-06-18T10:00:00.000Z',
    };
    const diagnostic = formatSyncDiagnostic(profile, metadata, metadata.syncedAt);

    expect(diagnostic).toContain('Calendar host: cyberjet.frenchbee.com');
    expect(diagnostic).toContain('Displayed flights: 2');
    expect(diagnostic).toContain('Ungrouped parser items: 1');
    expect(diagnostic).toContain('Parser groups: 1');
    expect(diagnostic).not.toContain('SECRET');
  });
});
