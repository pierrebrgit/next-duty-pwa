import { Rotation, UserProfile } from '../types';

export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export const isTodayThisDay = (day: number, month: number, year: number): boolean => {
  const today = new Date();
  return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
};

export const isWeekendThisDay = (day: number, month: number, year: number): boolean => {
  const date = new Date(year, month, day);
  return date.getDay() === 0 || date.getDay() === 6;
};

export const isRosterdayThisDay = (day: number, month: number, year: number): boolean => {
  const days = getDaysInMonth(year, month);
  if (days === 28 && day === 14) return true;
  if (days === 29 && day === 15) return true;
  if (days === 30 && day === 16) return true;
  if (days === 31 && day === 17) return true;
  return false;
};

export const isRotationOverMonth = (rotation: Rotation, year: number, month: number): boolean => {
  const month_start = new Date(Date.UTC(year, month, 1));
  const month_end = new Date(Date.UTC(year, month + 1, 0));
  month_end.setUTCHours(23, 59, 59, 999);

  const start = new Date(rotation.startDate);
  const end = new Date(rotation.endDate);

  return (end > month_start && end < month_end) || (start > month_start && start < month_end);
};

export const hasRotationsOverMonth = (rotations: Rotation[] | undefined, year: number, month: number): boolean => {
  if (!rotations) return false;
  return rotations.some(r => isRotationOverMonth(r, year, month));
};

export const sortProfilesByDay = (
  profiles: UserProfile[],
  start: Date,
  end: Date,
  year: number,
  month: number
): UserProfile[] => {
  const activeProfiles = profiles.filter(p => hasRotationsOverMonth(p.rotations, year, month));
  
  const profiles_leaving: { ref: Date; prof: UserProfile }[] = [];
  const profiles_arriving: { ref: Date; prof: UserProfile }[] = [];

  activeProfiles.forEach(profile => {
    profile.rotations?.forEach(rotation => {
      rotation.flights.forEach((f, idx) => {
        const fStart = new Date(f.startDate);
        const fEnd = new Date(f.endDate);

        if (fStart >= start && fStart <= end) {
          profiles_leaving.push({ ref: fStart, prof: profile });
        } else if (fEnd >= start && fEnd <= end) {
          profiles_arriving.push({ ref: fEnd, prof: profile });
        } else if (fEnd <= start && idx < rotation.flights.length - 1) {
          const nfStart = new Date(rotation.flights[idx+1].startDate);
          if (nfStart >= end) {
            profiles_arriving.push({ ref: fEnd, prof: profile });
          }
        }
      });
    });
  });

  profiles_leaving.sort((a, b) => a.ref.getTime() - b.ref.getTime());
  profiles_arriving.sort((a, b) => a.ref.getTime() - b.ref.getTime());

  const matched = [...profiles_leaving, ...profiles_arriving].map(o => o.prof);
  const matchedIds = new Set(matched.map(o => o.webcal));
  const unmatched = profiles.filter(p => !matchedIds.has(p.webcal));

  return [...matched, ...unmatched];
};

export const sortProfilesByLayover = (
  profiles: UserProfile[],
  layoverAirport: string,
  startTime: Date,
  endTime: Date,
  year: number,
  month: number
): { matched: UserProfile[]; unmatched: UserProfile[] } => {
  const activeProfiles = profiles.filter(p => hasRotationsOverMonth(p.rotations, year, month));
  
  const matched_leaving: { ref: Date; prof: UserProfile }[] = [];
  const matched_arriving: { ref: Date; prof: UserProfile }[] = [];

  activeProfiles.forEach(profile => {
    profile.rotations?.forEach(rotation => {
      rotation.flights.forEach((f, idx) => {
        const fEnd = new Date(f.endDate);
        const fStart = new Date(f.startDate);

        if (f.destination === layoverAirport && fEnd >= startTime && fEnd <= endTime) {
          matched_arriving.push({ ref: fEnd, prof: profile });
        }
        
        if (f.origin === layoverAirport && fStart >= startTime && fStart <= endTime) {
          matched_leaving.push({ ref: fStart, prof: profile });
        }

        if (idx < rotation.flights.length - 1) {
           const nextFlight = rotation.flights[idx+1];
           const nfStart = new Date(nextFlight.startDate);
           if (f.destination === layoverAirport && fEnd < startTime && nfStart > endTime) {
             matched_arriving.push({ ref: fEnd, prof: profile });
           }
        }
      });
    });
  });

  const matched = [...matched_leaving, ...matched_arriving].map(m => m.prof);
  const matchedIds = new Set(matched.map(m => m.webcal));
  const unmatched = profiles.filter(p => !matchedIds.has(p.webcal));

  return { matched, unmatched };
};
