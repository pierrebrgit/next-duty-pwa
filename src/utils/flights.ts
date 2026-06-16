import { Flight, Rotation, Roster, UserProfile } from '../types';

export const getRosterFlights = (roster: Roster): Flight[] => {
  if (roster.flights?.length) return roster.flights;
  return roster.rotations.flatMap(rotation => rotation.flights || []);
};

export const getProfileFlights = (profile: UserProfile): Flight[] => {
  if (profile.flights?.length) return profile.flights;
  return ((profile.rotations as Rotation[] | undefined) || [])
    .flatMap(rotation => rotation.flights || []);
};
