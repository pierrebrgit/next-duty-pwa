export interface Flight {
  origin: string;
  startDate: string | Date;
  flightNumber: string;
  endDate: string | Date;
  destination: string;
}

export interface Rotation {
  flights: Flight[];
  startDate: string | Date;
  endDate: Date; // Keep as Date for easier comparison in some places
}

export interface Roster {
  base: string;
  rotations: Rotation[];
}

export interface UserProfile {
  uid: string;
  nickname: string;
  email: string;
  base: string;
  position: string;
  webcal: string;
  buddies?: string[];
  rotations?: Rotation[];
  setup?: number;
}
