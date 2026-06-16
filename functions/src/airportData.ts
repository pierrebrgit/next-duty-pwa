export const ICAO_TO_IATA: Record<string, string> = {
  LFPO: "ORY",
  FMEE: "RUN",
  NTAA: "PPT",
  KSFO: "SFO",
  KEWR: "EWR",
  KLAX: "LAX",
  KMIA: "MIA",
  CYUL: "YUL",
  LFBO: "TLS",
  LFPG: "CDG",
  MMUN: "CUN",
  MDPC: "PUJ",
  MMPR: "PVR",
  GVAC: "SID",
  HDAM: "JIB",
  LFLX: "CHR",
  LHBP: "BUD",
  VRMM: "MLE",
  VCBI: "CMB",
  VCCC: "RML",
  NWWW: "NOU",
  NWWM: "GEA",
  FIMP: "MRU",
  FIMR: "RRG",
  OMDB: "DXB",
  OMDW: "DWC",
};

export const toIata = (value: string): string => {
  const normalized = value.toUpperCase().trim();
  return ICAO_TO_IATA[normalized] || normalized;
};
