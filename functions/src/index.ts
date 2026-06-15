import {promises as dns} from "node:dns";
import net from "node:net";
import {onRequest} from "firebase-functions/v2/https";
import * as ical from "node-ical";
import cors from "cors";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://airbuddy.web.app",
  "https://airbuddy.firebaseapp.com",
  "https://bee-buddy-2.web.app",
  "https://bee-buddy-2.firebaseapp.com",
];

const FETCH_TIMEOUT_MS = 30000;
const MAX_ICS_BYTES = 10_000_000;
const MAX_URL_LENGTH = 2048;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

const corsHandler = cors({
  origin: (origin, callback) => {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  maxAge: 3600,
});

const rateLimits = new Map<string, {count: number; resetAt: number}>();

interface Flight {
  origin: string;
  startDate: Date;
  flightNumber: string;
  endDate: Date;
  destination: string;
}

interface Rotation {
  flights: Flight[];
  startDate: Date;
  endDate: Date;
}

interface Roster {
  base: string;
  rotations: Rotation[];
}

interface CalendarEvent {
  type?: string;
  summary?: unknown;
  location?: unknown;
  description?: unknown;
  start?: unknown;
  end?: unknown;
}

interface RequestLike {
  headers: {
    [key: string]: string | string[] | undefined;
  };
  ip?: string;
}

const isAllowedOrigin = (origin: string): boolean => {
  const configured = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const allowedOrigins = [...DEFAULT_ALLOWED_ORIGINS, ...configured];

  try {
    const url = new URL(origin);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return true;
    }
    return allowedOrigins.includes(url.origin);
  } catch {
    return false;
  }
};

const icaoIata = (str: string): string => {
  const mapping: {[key: string]: string} = {
    "LFPO": "ORY",
    "FMEE": "RUN",
    "NTAA": "PPT",
    "KSFO": "SFO",
    "KEWR": "EWR",
    "KLAX": "LAX",
    "KMIA": "MIA",
    "LFBO": "TLS",
    "LFPG": "CDG",
    "MMUN": "CUN",
    "MDPC": "PUJ",
    "MMPR": "PVR",
    "GVAC": "SID",
    "HDAM": "JIB",
    "LFLX": "CHR",
    "LHBP": "BUD",
    "VRMM": "MLE",
    "VCBI": "CMB",
    "VCCC": "RML",
    "NWWW": "NOU",
    "NWWM": "GEA",
    "FIMP": "MRU",
    "FIMR": "RRG",
    "OMDB": "DXB",
    "OMDW": "DWC",
  };
  const up = str.toUpperCase().trim();
  return mapping[up] || up;
};

const extractFlightNumber = (summary: string): string | null => {
  const match = summary.match(/^(BF\d+|FWI\d+|MEP\d+|7\d+|\d{3,4})/i);
  return match ? match[1].toUpperCase() : null;
};

const asCalendarEvent = (event: unknown): CalendarEvent | null => {
  if (typeof event !== "object" || event === null) return null;
  return event as CalendarEvent;
};

const processIcal = (
  calendar: Record<string, unknown>,
  base: string
): Roster => {
  const flightsMeps: Flight[] = [];

  console.log("--- START PROCESS ICAL ---");

  for (const event of Object.values(calendar)) {
    const ev = asCalendarEvent(event);
    if (!ev || ev.type !== "VEVENT") continue;

    const summary = (ev.summary || "").toString().trim();
    const flightNumber = extractFlightNumber(summary);
    if (!flightNumber) continue;

    const location = (ev.location || "").toString();
    const parts = location.split(/[^a-zA-Z0-9]+/)
      .filter((part) => part.length >= 3);

    if (parts.length < 2 || !(ev.start instanceof Date) ||
        !(ev.end instanceof Date)) {
      continue;
    }

    const startBase = icaoIata(parts[0]);
    const endBase = icaoIata(parts[1]);

    if (summary.toUpperCase().startsWith("MEP")) {
      if (["TLS", "CDG"].includes(startBase) ||
          ["TLS", "CDG"].includes(endBase)) {
        continue;
      }
    }

    flightsMeps.push({
      origin: startBase,
      startDate: ev.start,
      flightNumber,
      endDate: ev.end,
      destination: endBase,
    });
  }

  flightsMeps.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const roster: Roster = {
    base,
    rotations: [],
  };

  for (let i = 0; i < flightsMeps.length; i++) {
    if (flightsMeps[i].origin !== base) continue;

    const rotationFlights = [flightsMeps[i]];
    let currentDestination = flightsMeps[i].destination;
    let j = i + 1;

    while (currentDestination !== base && j < flightsMeps.length) {
      const nextFlight = flightsMeps[j];
      if (nextFlight.origin !== currentDestination) break;

      rotationFlights.push(nextFlight);
      currentDestination = nextFlight.destination;
      j++;
    }

    if (currentDestination === base && rotationFlights.length > 1) {
      roster.rotations.push({
        flights: rotationFlights,
        startDate: rotationFlights[0].startDate,
        endDate: rotationFlights[rotationFlights.length - 1].endDate,
      });
      i = j - 1;
    }
  }

  console.log(`--- END PROCESS ICAL: ${roster.rotations.length} ---`);
  return roster;
};

const readString = (value: unknown): string | undefined => {
  if (Array.isArray(value)) return readString(value[0]);
  return typeof value === "string" ? value.trim() : undefined;
};

const normalizeBase = (rawBase: string | undefined): string => {
  if (!rawBase) throw new Error("Missing base parameter");

  const base = icaoIata(rawBase);
  if (!/^[A-Z0-9]{3}$/.test(base)) {
    throw new Error("Invalid base parameter");
  }
  return base;
};

const configuredHostAllowlist = (): string[] => {
  return (process.env.ALLOWED_ICS_HOSTS || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
};

const isHostAllowed = (hostname: string): boolean => {
  const allowlist = configuredHostAllowlist();
  if (allowlist.length === 0) return true;

  return allowlist.some((entry) => {
    if (entry.startsWith(".")) return hostname.endsWith(entry);
    return hostname === entry || hostname.endsWith(`.${entry}`);
  });
};

const isPrivateIp = (address: string): boolean => {
  const ipVersion = net.isIP(address);
  if (ipVersion === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224;
  }

  if (ipVersion === 6) {
    const normalized = address.toLowerCase();
    if (normalized.startsWith("::ffff:")) {
      return isPrivateIp(normalized.replace("::ffff:", ""));
    }
    return normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:");
  }

  return true;
};

const ensurePublicHostname = async (hostname: string): Promise<void> => {
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error("Calendar host is not allowed");
    return;
  }

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Calendar host is not allowed");
  }

  const records = await dns.lookup(hostname, {all: true, verbatim: true});
  if (records.length === 0 ||
      records.some((record) => isPrivateIp(record.address))) {
    throw new Error("Calendar host is not allowed");
  }
};

const normalizeCalendarUrl = async (
  rawUrl: string | undefined
): Promise<URL> => {
  if (!rawUrl) throw new Error("Missing ics parameter");
  if (rawUrl.length > MAX_URL_LENGTH) {
    throw new Error("Calendar URL is too long");
  }

  const normalized = rawUrl.replace(/^webcal:\/\//i, "https://");
  const url = new URL(normalized);
  const hostname = url.hostname.toLowerCase();

  if (url.protocol !== "https:") {
    throw new Error("Calendar URL must use webcal or https");
  }
  if (url.username || url.password) {
    throw new Error("Calendar URL credentials are not allowed");
  }
  if (!isHostAllowed(hostname)) {
    throw new Error("Calendar host is not allowlisted");
  }

  await ensurePublicHostname(hostname);
  url.hash = "";
  return url;
};

const fetchCalendarText = async (url: URL): Promise<string> => {
  const response = await fetch(url, {
    headers: {
      "Accept": "text/calendar,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Calendar responded with status ${response.status}`);
  }

  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_ICS_BYTES) {
    throw new Error("Calendar response is too large");
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_ICS_BYTES) {
    throw new Error("Calendar response is too large");
  }
  return Buffer.from(buffer).toString("utf8");
};

const clientKey = (req: RequestLike): string => {
  const forwardedFor = req.headers["x-forwarded-for"];
  const value = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  return value?.split(",")[0].trim() || req.ip || "unknown";
};

const isRateLimited = (key: string): boolean => {
  const now = Date.now();
  const current = rateLimits.get(key);

  if (!current || current.resetAt <= now) {
    rateLimits.set(key, {count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS});
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
};

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : "Unknown error";
};

const statusForErrorMessage = (message: string): number => {
  if (/too large/i.test(message)) return 413;
  const clientErrorPattern =
    /Missing|Invalid|not allowed|too long|allowlisted|must use/i;
  if (clientErrorPattern.test(message)) {
    return 400;
  }
  return 502;
};

export const getProfile = onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    if (!["GET", "POST"].includes(req.method)) {
      res.set("Allow", "GET, POST, OPTIONS");
      res.status(405).send({message: "Method not allowed"});
      return;
    }

    if (isRateLimited(clientKey(req))) {
      res.status(429).send({
        message: "Too many sync attempts. Try again later.",
      });
      return;
    }

    const body = typeof req.body === "object" && req.body !== null ?
      req.body as Record<string, unknown> :
      {};
    const query = req.query as Record<string, unknown>;

    try {
      const base = normalizeBase(
        readString(body.base) || readString(query.base)
      );
      const calendarUrl = await normalizeCalendarUrl(
        readString(body.ics) || readString(query.ics)
      );
      const calendarText = await fetchCalendarText(calendarUrl);
      const webEvents = ical.sync.parseICS(calendarText) as Record<
        string,
        unknown
      >;
      const roster = processIcal(webEvents, base);
      res.send(roster);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      const status = statusForErrorMessage(message);

      if (status === 502) {
        console.error("Calendar processing failed", message);
      }

      res.status(status).send({
        message: status === 502 ? "Unable to process calendar" : message,
      });
    }
  });
});

export const wakeup = onRequest((req, res) => {
  return corsHandler(req, res, () => {
    res.send("Next Duty API is awake");
  });
});
