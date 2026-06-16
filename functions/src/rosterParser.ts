import {toIata} from "./airportData";

export interface Flight {
  origin: string;
  startDate: Date;
  flightNumber: string;
  endDate: Date;
  destination: string;
}

export interface Rotation {
  flights: Flight[];
  startDate: Date;
  endDate: Date;
  complete: boolean;
}

export interface Roster {
  base: string;
  flights: Flight[];
  rotations: Rotation[];
  unmatchedFlights: Flight[];
}

export interface CalendarEvent {
  type?: string;
  summary?: unknown;
  location?: unknown;
  description?: unknown;
  start?: unknown;
  end?: unknown;
}

const extractFlightNumber = (summary: string): string | null => {
  const match = summary.match(/^(BF\d+|FWI\d+|MEP\d+|7\d+|\d{3,4})/i);
  return match ? match[1].toUpperCase() : null;
};

const asCalendarEvent = (event: unknown): CalendarEvent | null => {
  if (typeof event !== "object" || event === null) return null;
  return event as CalendarEvent;
};

const shouldSkipMep = (
  summary: string,
  origin: string,
  destination: string
) => {
  if (!summary.toUpperCase().startsWith("MEP")) return false;
  return ["TLS", "CDG"].includes(origin) ||
    ["TLS", "CDG"].includes(destination);
};

export const extractFlights = (
  calendar: Record<string, unknown>
): Flight[] => {
  const flights: Flight[] = [];

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

    const origin = toIata(parts[0]);
    const destination = toIata(parts[1]);

    if (shouldSkipMep(summary, origin, destination)) continue;

    flights.push({
      origin,
      startDate: ev.start,
      flightNumber,
      endDate: ev.end,
      destination,
    });
  }

  return flights.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
};

export const processIcal = (
  calendar: Record<string, unknown>,
  base: string
): Roster => {
  const flights = extractFlights(calendar);
  const usedFlightIndexes = new Set<number>();
  const rotations: Rotation[] = [];

  for (let i = 0; i < flights.length; i++) {
    if (usedFlightIndexes.has(i) || flights[i].origin !== base) continue;

    const rotationFlights = [flights[i]];
    usedFlightIndexes.add(i);

    let currentDestination = flights[i].destination;
    let j = i + 1;

    while (currentDestination !== base && j < flights.length) {
      const nextFlight = flights[j];
      if (usedFlightIndexes.has(j) ||
          nextFlight.origin !== currentDestination) {
        break;
      }

      rotationFlights.push(nextFlight);
      usedFlightIndexes.add(j);
      currentDestination = nextFlight.destination;
      j++;
    }

    rotations.push({
      flights: rotationFlights,
      startDate: rotationFlights[0].startDate,
      endDate: rotationFlights[rotationFlights.length - 1].endDate,
      complete: currentDestination === base,
    });
  }

  const unmatchedFlights = flights.filter((_, index) => {
    return !usedFlightIndexes.has(index);
  });

  return {
    base,
    flights,
    rotations,
    unmatchedFlights,
  };
};
