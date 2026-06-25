import { isSlotInPast, calculateDaysDiff } from './bookingService';

describe('isSlotInPast', () => {
  it('returns true when the slot end time is before now', () => {
    const now = new Date('2026-05-26T20:00:00');
    expect(isSlotInPast('2026-05-26', '19:00', now)).toBe(true);
  });

  it('returns false when the slot end time is after now', () => {
    const now = new Date('2026-05-26T08:00:00');
    expect(isSlotInPast('2026-05-26', '19:00', now)).toBe(false);
  });

  it('returns false when the slot is on a future date', () => {
    const now = new Date('2026-05-26T20:00:00');
    expect(isSlotInPast('2026-05-27', '08:00', now)).toBe(false);
  });

  it('returns true when the slot is on a past date', () => {
    const now = new Date('2026-05-26T08:00:00');
    expect(isSlotInPast('2026-05-25', '23:00', now)).toBe(true);
  });

  it('treats a slot ending exactly now as not in the past', () => {
    const now = new Date('2026-05-26T19:00:00');
    // end_time of 19:00 means bookingEndDateTime === now, not 
    expect(isSlotInPast('2026-05-26', '19:00', now)).toBe(false);
  });
});

describe('calculateDaysDiff', () => {
  it('returns 0 for a booking on the same day', () => {
    const now = new Date('2026-05-26T08:00:00');
    expect(calculateDaysDiff('2026-05-26', now)).toBe(0);
  });

  it('returns 1 for a booking tomorrow', () => {
    const now = new Date('2026-05-26T08:00:00');
    expect(calculateDaysDiff('2026-05-27', now)).toBe(1);
  });

  it('returns 7 for a booking exactly a week out', () => {
    const now = new Date('2026-05-26T08:00:00');
    expect(calculateDaysDiff('2026-06-02', now)).toBe(7);
  });

  it('returns a negative number for a booking in the past', () => {
    const now = new Date('2026-05-26T08:00:00');
    expect(calculateDaysDiff('2026-05-20', now)).toBe(-6);
  });

  it('is not affected by the time of day passed in now', () => {
    // Whether "now" is 1am or 11pm on the 26th, a booking on the 27th
    // should always be exactly 1 day away
    const earlyNow = new Date('2026-05-26T01:00:00');
    const lateNow  = new Date('2026-05-26T23:00:00');
    expect(calculateDaysDiff('2026-05-27', earlyNow)).toBe(1);
    expect(calculateDaysDiff('2026-05-27', lateNow)).toBe(1);
  });
});