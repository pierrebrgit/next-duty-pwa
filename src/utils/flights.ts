import { Flight, Rotation, Roster, UserProfile } from '../types';
import { toIata } from './airportData';

export const normalizeFlightAirports = (flight: Flight): Flight => ({
  ...flight,
  origin: toIata(flight.origin),
  destination: toIata(flight.destination),
});

export const normalizeRotationAirports = (rotation: Rotation): Rotation => ({
  ...rotation,
  flights: (rotation.flights || []).map(normalizeFlightAirports),
});

export const normalizeProfileAirports = (profile: UserProfile): UserProfile => ({
  ...profile,
  base: toIata(profile.base),
  flights: profile.flights?.map(normalizeFlightAirports),
  rotations: profile.rotations?.map(normalizeRotationAirports),
});

export const getRosterFlights = (roster: Roster): Flight[] => {
  const flights = roster.flights?.length ?
    roster.flights :
    roster.rotations.flatMap(rotation => rotation.flights || []);
  return flights.map(normalizeFlightAirports);
};

export const getProfileFlights = (profile: UserProfile): Flight[] => {
  const flights = profile.flights?.length ?
    profile.flights :
    ((profile.rotations as Rotation[] | undefined) || [])
    .flatMap(rotation => rotation.flights || []);
  return flights.map(normalizeFlightAirports);
};
