import {onRequest} from "firebase-functions/v2/https";
import * as ical from "node-ical";
import cors from "cors";

const corsHandler = cors({
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});

// Helper functions ported from beecore-render/app.js

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
  };
  const up = str.toUpperCase().trim();
  return mapping[up] || up;
};

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

const processIcal = (calendar: any, base: string): Roster => {
  const flightsMeps: Flight[] = [];

  console.log("--- START PROCESS ICAL ---");

  for (const event of Object.values(calendar)) {
    const ev = event as any;
    if (ev.type !== "VEVENT") continue;

    const summary = (ev.summary || "").toString().trim();
    // Cyberjet uses 7xx, BFxxx, FWIxxx, MEPxxx or 3-digit numbers
    const isFlight = /^(7|BF|FWI|MEP|\d{3})/i.test(summary);

    if (isFlight) {
      const location = ev.location || "";
      const parts = location.split(/[^a-zA-Z0-9]+/)
        .filter((s: string) => s.length >= 3);

      if (parts.length < 2) {
        continue;
      }

      const startBase = icaoIata(parts[0]);
      const endBase = icaoIata(parts[1]);
      const signinDate = ev.start as Date;
      const endDate = ev.end as Date;

      if (summary.toUpperCase().startsWith("MEP")) {
        if (["TLS", "CDG"].includes(startBase) ||
            ["TLS", "CDG"].includes(endBase)) {
          continue;
        }
      }

      flightsMeps.push({
        origin: startBase,
        startDate: signinDate,
        flightNumber: summary,
        endDate: endDate,
        destination: endBase,
      });
    }
  }

  // Sort by date
  flightsMeps.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const roster: Roster = {
    base: base,
    rotations: [],
  };

  for (let i = 0; i < flightsMeps.length; i++) {
    if (flightsMeps[i].origin === base) {
      const flight1 = flightsMeps[i];

      if (i + 1 < flightsMeps.length) {
        const flight2 = flightsMeps[i + 1];
        if (flight1.destination === flight2.origin &&
            flight2.destination === base) {
          roster.rotations.push({
            flights: [flight1, flight2],
            startDate: flight1.startDate,
            endDate: flight2.endDate,
          });
          i++;
        } else if (flight1.destination === flight2.origin &&
                 i + 3 < flightsMeps.length &&
                 flightsMeps[i + 3].destination === base) {
          const rotationFlights = [
            flightsMeps[i],
            flightsMeps[i + 1],
            flightsMeps[i + 2],
            flightsMeps[i + 3],
          ];
          roster.rotations.push({
            flights: rotationFlights,
            startDate: flight1.startDate,
            endDate: flightsMeps[i + 3].endDate,
          });
          i += 3;
        }
      }
    }
  }

  console.log(`--- END PROCESS ICAL: ${roster.rotations.length} ---`);
  return roster;
};

export const getProfile = onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    const wlink = req.query.ics as string;
    const base = req.query.base as string;

    if (!wlink || !base) {
      res.status(400).send({message: "Missing ics or base parameter"});
      return;
    }

    const nlink = encodeURI(wlink.replace("webcal", "https"));

    try {
      const webEvents = await ical.async.fromURL(nlink);
      const roster = processIcal(webEvents, base);
      res.send(roster);
    } catch (error: any) {
      res.status(500).send({
        message: "Error processing calendar: " + error.message,
      });
    }
  });
});

export const wakeup = onRequest((req, res) => {
  return corsHandler(req, res, () => {
    res.send("Bee Buddy API is awake");
  });
});
