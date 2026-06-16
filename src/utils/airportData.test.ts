import { describe, expect, it } from 'vitest';
import { getPickupOffsetMinutes } from './airportData';

describe('airportData', () => {
  it('uses the approved pickup offsets', () => {
    expect(getPickupOffsetMinutes('LAX')).toBe(-180);
    expect(getPickupOffsetMinutes('CUN')).toBe(-150);
    expect(getPickupOffsetMinutes('EWR')).toBe(-150);
    expect(getPickupOffsetMinutes('MIA')).toBe(-150);
    expect(getPickupOffsetMinutes('PPT')).toBe(-135);
    expect(getPickupOffsetMinutes('RUN')).toBe(-180);
    expect(getPickupOffsetMinutes('SFO')).toBe(-150);
    expect(getPickupOffsetMinutes('YUL')).toBe(-165);
  });
});
