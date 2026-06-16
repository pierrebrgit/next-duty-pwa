import { UserProfile, Flight, SyncMetadata, SyncMetadataInput } from '../types';

const STORAGE_KEY = 'next_duty_profile';
const SYNC_KEY = 'next_duty_last_sync';
const SYNC_METADATA_KEY = 'next_duty_sync_metadata';

export const saveProfile = (profile: UserProfile) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
};

export const loadProfile = (): UserProfile | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    clearProfile();
    return null;
  }
};

export const clearProfile = () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SYNC_KEY);
  localStorage.removeItem(SYNC_METADATA_KEY);
};

export const updateFlights = (flights: Flight[]) => {
  const profile = loadProfile();
  if (profile) {
    profile.flights = flights;
    saveProfile(profile);
    setLastSyncTimestamp();
  }
};

export const setLastSyncTimestamp = (metadata?: SyncMetadataInput): SyncMetadata | null => {
  const syncedAt = new Date().toISOString();
  localStorage.setItem(SYNC_KEY, syncedAt);

  if (!metadata) return null;

  const storedMetadata = { ...metadata, syncedAt };
  localStorage.setItem(SYNC_METADATA_KEY, JSON.stringify(storedMetadata));
  return storedMetadata;
};

export const getLastSyncTimestamp = (): string | null => {
  return localStorage.getItem(SYNC_KEY);
};

export const getSyncMetadata = (): SyncMetadata | null => {
  try {
    const data = localStorage.getItem(SYNC_METADATA_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    return {
      ...parsed,
      ungroupedFlightCount:
        parsed.ungroupedFlightCount ??
        parsed.skippedItemCount ??
        parsed.unmatchedFlightCount ??
        0,
      parserGroupCount: parsed.parserGroupCount ?? parsed.rotationCount,
    };
  } catch {
    localStorage.removeItem(SYNC_METADATA_KEY);
    return null;
  }
};
