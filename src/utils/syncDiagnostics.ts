import { Roster, SyncMetadata, SyncMetadataInput, UserProfile } from '../types';

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return 'n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'n/a';
  return date.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'n/a';
  return date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getWebcalHost = (webcal: string) => {
  try {
    return new URL(webcal.replace(/^webcal:\/\//i, 'https://')).host;
  } catch {
    return 'invalid URL';
  }
};

export const buildSyncMetadata = (roster: Roster): SyncMetadataInput => {
  const flights = roster.rotations.flatMap(rotation => rotation.flights || []);
  const timestamps = flights
    .flatMap(flight => [flight.startDate, flight.endDate])
    .map(value => new Date(value).getTime())
    .filter(value => !Number.isNaN(value));

  const periodStart = timestamps.length ? new Date(Math.min(...timestamps)).toISOString() : null;
  const periodEnd = timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;

  return {
    base: roster.base,
    rotationCount: roster.rotations.length,
    flightCount: flights.length,
    unmatchedFlightCount: roster.unmatchedFlights?.length || 0,
    periodStart,
    periodEnd,
  };
};

export const formatSyncPeriod = (metadata: SyncMetadata | null) => {
  if (!metadata?.periodStart || !metadata.periodEnd) return 'No roster period';
  return `${formatDate(metadata.periodStart)} to ${formatDate(metadata.periodEnd)}`;
};

export const formatSyncSummary = (metadata: SyncMetadata | null) => {
  if (!metadata) return 'No sync details';
  const unmatched = metadata.unmatchedFlightCount ?
    ` · ${metadata.unmatchedFlightCount} unmatched` :
    '';
  return `${metadata.flightCount} flights · ${metadata.rotationCount} rotations${unmatched}`;
};

export const formatSyncDiagnostic = (
  profile: UserProfile,
  metadata: SyncMetadata | null,
  lastSync: string | null
) => {
  return [
    'Next Duty diagnostic',
    `Generated: ${formatDateTime(new Date().toISOString())}`,
    `Nickname: ${profile.nickname || 'n/a'}`,
    `Base: ${profile.base || 'n/a'}`,
    `Calendar host: ${getWebcalHost(profile.webcal || '')}`,
    `Last sync: ${formatDateTime(metadata?.syncedAt || lastSync)}`,
    `Roster period: ${formatSyncPeriod(metadata)}`,
    `Flights: ${metadata?.flightCount ?? 'n/a'}`,
    `Rotations: ${metadata?.rotationCount ?? 'n/a'}`,
    `Unmatched flights: ${metadata?.unmatchedFlightCount ?? 'n/a'}`,
  ].join('\n');
};
