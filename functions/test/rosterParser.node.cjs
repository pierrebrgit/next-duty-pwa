const assert = require("node:assert/strict");
const test = require("node:test");

const {processIcal} = require("../lib/rosterParser.js");

const event = (summary, location, start, end) => ({
  type: "VEVENT",
  summary,
  location,
  start: new Date(start),
  end: new Date(end),
});

test("processIcal converts ICAO airports and returns canonical flights", () => {
  const roster = processIcal({
    outbound: event(
      "BF710",
      "LFPO - HDAM",
      "2026-06-15T08:00:00Z",
      "2026-06-15T15:00:00Z"
    ),
    inbound: event(
      "BF711",
      "HDAM - LFPO",
      "2026-06-17T08:00:00Z",
      "2026-06-17T15:00:00Z"
    ),
  }, "ORY");

  assert.equal(roster.rotations.length, 1);
  assert.equal(roster.flights.length, 2);
  assert.equal(roster.rotations[0].complete, true);
  assert.deepEqual(
    roster.flights.map((flight) => [flight.origin, flight.destination]),
    [["ORY", "JIB"], ["JIB", "ORY"]]
  );
  assert.deepEqual(
    roster.rotations[0].flights.map((flight) => [
      flight.origin,
      flight.destination,
    ]),
    [["ORY", "JIB"], ["JIB", "ORY"]]
  );
});

test("processIcal preserves partial base departures", () => {
  const roster = processIcal({
    outbound: event(
      "BF720",
      "LFPO - LFLX",
      "2026-06-15T08:00:00Z",
      "2026-06-15T09:00:00Z"
    ),
  }, "ORY");

  assert.equal(roster.rotations.length, 1);
  assert.equal(roster.flights.length, 1);
  assert.equal(roster.rotations[0].complete, false);
  assert.equal(roster.rotations[0].flights[0].destination, "CHR");
});

test("processIcal skips MEP events touching TLS or CDG", () => {
  const roster = processIcal({
    mep: event(
      "MEP123",
      "LFPO - LFPG",
      "2026-06-15T08:00:00Z",
      "2026-06-15T09:00:00Z"
    ),
  }, "ORY");

  assert.equal(roster.rotations.length, 0);
  assert.equal(roster.flights.length, 0);
  assert.equal(roster.unmatchedFlights.length, 0);
});

test("processIcal converts CYUL to YUL", () => {
  const roster = processIcal({
    flight: event(
      "BF730",
      "CYUL - LFPO",
      "2026-06-15T08:00:00Z",
      "2026-06-15T15:00:00Z"
    ),
  }, "YUL");

  assert.equal(roster.flights.length, 1);
  assert.equal(roster.flights[0].origin, "YUL");
  assert.equal(roster.flights[0].destination, "ORY");
});
