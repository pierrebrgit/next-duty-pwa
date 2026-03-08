import axios from 'axios';
import { Roster } from '../types';

const GET_PROFILE_URL = 'https://getprofile-atrwfvyqwa-uc.a.run.app';
const WAKEUP_URL = 'https://wakeup-atrwfvyqwa-uc.a.run.app';

export const fetchProfileRoster = async (base: string, ics: string): Promise<Roster> => {
  const response = await axios.get<Roster>(GET_PROFILE_URL, {
    params: { base, ics }
  });
  return response.data;
};

export const wakeUpBackend = async (): Promise<void> => {
  await axios.get(WAKEUP_URL);
};
