import { Roster } from '../types';

const GET_PROFILE_URL = import.meta.env.VITE_GET_PROFILE_URL || 'https://getprofile-atrwfvyqwa-uc.a.run.app';
const WAKEUP_URL = import.meta.env.VITE_WAKEUP_URL || 'https://wakeup-atrwfvyqwa-uc.a.run.app';

const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const payload = await response.json();
        if (typeof payload?.message === 'string') message = payload.message;
      } catch {
        // Keep the generic HTTP status message.
      }
      throw new Error(message);
    }

    return await response.json() as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Sync timed out. Please try again in a moment.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const fetchProfileRoster = async (base: string, ics: string): Promise<Roster> => {
  return requestJson<Roster>(GET_PROFILE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ base, ics }),
  });
};

export const wakeUpBackend = async (): Promise<void> => {
  await fetch(WAKEUP_URL);
};
