import { Flight } from '../types';

export const getNextDutyIndex = (flights: Flight[], now = new Date()): number => {
  if (flights.length === 0) return 0;
  const nextIndex = flights.findIndex(f => new Date(f.endDate) > now);
  return nextIndex !== -1 ? nextIndex : flights.length - 1;
};
