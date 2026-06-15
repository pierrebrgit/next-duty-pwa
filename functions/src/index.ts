import {promises as dns} from "node:dns";
import net from "node:net";
import {onRequest} from "firebase-functions/v2/https";
import * as ical from "node-ical";
import cors from "cors";
import {toIata} from "./airportData";
import {processIcal} from "./rosterParser";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://airbuddy.web.app",
  "https://airbuddy.firebaseapp.com",
  "https://bee-buddy-2.web.app",
  "https://bee-buddy-2.firebaseapp.com",
];
const DEFAULT_ALLOWED_ICS_HOSTS = ["cyberjet.frenchbee.com"];

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

const readString = (value: unknown): string | undefined => {
  if (Array.isArray(value)) return readString(value[0]);
  return typeof value === "string" ? value.trim() : undefined;
};

const normalizeBase = (rawBase: string | undefined): string => {
  if (!rawBase) throw new Error("Missing base parameter");

  const base = toIata(rawBase);
  if (!/^[A-Z0-9]{3}$/.test(base)) {
    throw new Error("Invalid base parameter");
  }
  return base;
};

const configuredHostAllowlist = (): string[] => {
  const configured = (process.env.ALLOWED_ICS_HOSTS || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return [...DEFAULT_ALLOWED_ICS_HOSTS, ...configured];
};

const isHostAllowed = (hostname: string): boolean => {
  const allowlist = configuredHostAllowlist();

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
    redirect: "manual",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (response.status >= 300 && response.status < 400) {
    throw new Error("Calendar redirects are not allowed");
  }

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
  return req.ip || value?.split(",")[0].trim() || "unknown";
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
    /Missing|Invalid|not allowed|too long|allowlisted|must use|redirect/i;
  if (clientErrorPattern.test(message)) {
    return 400;
  }
  return 502;
};

export const getProfile = onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.set("Allow", "POST, OPTIONS");
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

    try {
      const base = normalizeBase(readString(body.base));
      const calendarUrl = await normalizeCalendarUrl(readString(body.ics));
      const calendarText = await fetchCalendarText(calendarUrl);
      const webEvents = ical.sync.parseICS(calendarText) as Record<
        string,
        unknown
      >;
      const roster = processIcal(webEvents, base);
      console.log(
        `Calendar processed: ${roster.rotations.length} rotations, ` +
        `${roster.unmatchedFlights.length} unmatched flights`
      );
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
