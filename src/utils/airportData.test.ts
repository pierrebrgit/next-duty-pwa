import { describe, expect, it } from 'vitest';
import { getPickupOffsetMinutes, getAirportTimeZone, toIata } from './airportData';

describe('airportData', () => {
  it('converts known ICAO codes to IATA', () => {
    expect(toIata('CYUL')).toBe('YUL');
    expect(toIata(' cyul ')).toBe('YUL');
    expect(toIata('LFPO')).toBe('ORY');
  });

  it('uses the approved pickup offsets', () => {
    expect(getPickupOffsetMinutes('LAX')).toBe(-180);
    expect(getPickupOffsetMinutes('CUN')).toBe(-150);
    expect(getPickupOffsetMinutes('EWR')).toBe(-150);
    expect(getPickupOffsetMinutes('MIA')).toBe(-150);
    expect(getPickupOffsetMinutes('PPT')).toBe(-135);
    expect(getPickupOffsetMinutes('RUN')).toBe(-180);
    expect(getPickupOffsetMinutes('SFO')).toBe(-150);
    expect(getPickupOffsetMinutes('YUL')).toBe(-165);
    expect(getPickupOffsetMinutes('CYUL')).toBe(-165);
  });

  it('uses IATA data when a known ICAO code is passed', () => {
    expect(getAirportTimeZone('CYUL')).toBe('America/Toronto');
  });
});
