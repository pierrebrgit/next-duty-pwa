export type AirportInfo = {
  iata: string;
  icao?: string;
  label: string;
  timeZone: string;
  pickupOffsetMinutes?: number;
};

export const AIRPORTS: Record<string, AirportInfo> = {
  ORY: {iata: "ORY", icao: "LFPO", label: "Paris Orly", timeZone: "Europe/Paris"},
  TLS: {iata: "TLS", icao: "LFBO", label: "Toulouse", timeZone: "Europe/Paris"},
  CDG: {iata: "CDG", icao: "LFPG", label: "Paris CDG", timeZone: "Europe/Paris"},
  CHR: {iata: "CHR", icao: "LFLX", label: "Chateauroux", timeZone: "Europe/Paris"},
  LAX: {iata: "LAX", icao: "KLAX", label: "Los Angeles", timeZone: "America/Los_Angeles", pickupOffsetMinutes: -180},
  SFO: {iata: "SFO", icao: "KSFO", label: "San Francisco", timeZone: "America/Los_Angeles", pickupOffsetMinutes: -150},
  EWR: {iata: "EWR", icao: "KEWR", label: "Newark", timeZone: "America/New_York", pickupOffsetMinutes: -150},
  MIA: {iata: "MIA", icao: "KMIA", label: "Miami", timeZone: "America/New_York", pickupOffsetMinutes: -150},
  YUL: {iata: "YUL", icao: "CYUL", label: "Montreal", timeZone: "America/Toronto", pickupOffsetMinutes: -165},
  RUN: {iata: "RUN", icao: "FMEE", label: "Reunion", timeZone: "Indian/Reunion", pickupOffsetMinutes: -180},
  PPT: {iata: "PPT", icao: "NTAA", label: "Tahiti", timeZone: "Pacific/Tahiti", pickupOffsetMinutes: -135},
  CUN: {iata: "CUN", icao: "MMUN", label: "Cancun", timeZone: "America/Cancun", pickupOffsetMinutes: -150},
  PUJ: {iata: "PUJ", icao: "MDPC", label: "Punta Cana", timeZone: "America/Santo_Domingo"},
  PVR: {iata: "PVR", icao: "MMPR", label: "Puerto Vallarta", timeZone: "America/Mexico_City"},
  SID: {iata: "SID", icao: "GVAC", label: "Sal", timeZone: "Atlantic/Cape_Verde"},
  JIB: {iata: "JIB", icao: "HDAM", label: "Djibouti", timeZone: "Africa/Djibouti"},
  BUD: {iata: "BUD", icao: "LHBP", label: "Budapest", timeZone: "Europe/Budapest"},
  MLE: {iata: "MLE", icao: "VRMM", label: "Male", timeZone: "Indian/Maldives"},
  CMB: {iata: "CMB", icao: "VCBI", label: "Colombo", timeZone: "Asia/Colombo"},
  RML: {iata: "RML", icao: "VCCC", label: "Colombo Ratmalana", timeZone: "Asia/Colombo"},
  NOU: {iata: "NOU", icao: "NWWW", label: "Noumea", timeZone: "Pacific/Noumea"},
  GEA: {iata: "GEA", icao: "NWWM", label: "Noumea Magenta", timeZone: "Pacific/Noumea"},
  MRU: {iata: "MRU", icao: "FIMP", label: "Mauritius", timeZone: "Indian/Mauritius"},
  RRG: {iata: "RRG", icao: "FIMR", label: "Rodrigues", timeZone: "Indian/Mauritius"},
  DXB: {iata: "DXB", icao: "OMDB", label: "Dubai", timeZone: "Asia/Dubai"},
  DWC: {iata: "DWC", icao: "OMDW", label: "Dubai Al Maktoum", timeZone: "Asia/Dubai"},
};

export const getAirportTimeZone = (airport: string): string => {
  return AIRPORTS[airport.toUpperCase()]?.timeZone || "UTC";
};

export const getPickupOffsetMinutes = (airport: string): number | undefined => {
  return AIRPORTS[airport.toUpperCase()]?.pickupOffsetMinutes;
};
