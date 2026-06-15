import { UserProfile, Rotation } from '../types';

const STORAGE_KEY = 'next_duty_profile';
const SYNC_KEY = 'next_duty_last_sync';

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
};

export const updateRotations = (rotations: Rotation[]) => {
  const profile = loadProfile();
  if (profile) {
    profile.rotations = rotations;
    saveProfile(profile);
    setLastSyncTimestamp();
  }
};

export const setLastSyncTimestamp = () => {
  localStorage.setItem(SYNC_KEY, new Date().toISOString());
};

export const getLastSyncTimestamp = (): string | null => {
  return localStorage.getItem(SYNC_KEY);
};
