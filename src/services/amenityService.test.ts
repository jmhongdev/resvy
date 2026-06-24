import {
  timeToMinutes,
  minutesToTime,
  generateTimeSlots,
  hasOverlap,
} from './amenityService';

describe('timeToMinutes', () => {
  it('converts HH:MM to total minutes', () => {
    expect(timeToMinutes('09:00')).toBe(540);
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  it('handles HH:MM:SS format by ignoring seconds', () => {
    expect(timeToMinutes('09:00:00')).toBe(540);
  });
});

describe('minutesToTime', () => {
  it('converts minutes back to HH:MM format', () => {
    expect(minutesToTime(540)).toBe('09:00');
    expect(minutesToTime(0)).toBe('00:00');
    expect(minutesToTime(1439)).toBe('23:59');
  });

  it('pads single digit hours and minutes with zero', () => {
    expect(minutesToTime(65)).toBe('01:05');
  });
});

describe('generateTimeSlots', () => {
  it('generates correct number of slots for a full day', () => {
    // 08:00 to 22:00 with 60 min slots = 14 slots
    const slots = generateTimeSlots('08:00', '22:00', 60);
    expect(slots).toHaveLength(14);
    expect(slots[0]).toBe('08:00');
    expect(slots[slots.length - 1]).toBe('21:00');
  });

  it('does not generate a partial slot at the end', () => {
    // 08:00 to 09:30 with 60 min slots = only 1 full slot fits
    const slots = generateTimeSlots('08:00', '09:30', 60);
    expect(slots).toEqual(['08:00']);
  });

  it('handles 30 minute slot durations', () => {
    const slots = generateTimeSlots('08:00', '10:00', 30);
    expect(slots).toEqual(['08:00', '08:30', '09:00', '09:30']);
  });

  it('returns empty array when open and close time are equal', () => {
    const slots = generateTimeSlots('08:00', '08:00', 60);
    expect(slots).toEqual([]);
  });
});

describe('hasOverlap', () => {
  it('detects overlap when a booking fully covers a slot', () => {
    // slot 09:00-10:00, booking 08:30-10:30
    expect(hasOverlap(540, 600, 510, 630)).toBe(true);
  });

  it('detects overlap when booking starts inside the slot', () => {
    // slot 09:00-10:00, booking 09:30-10:30
    expect(hasOverlap(540, 600, 570, 630)).toBe(true);
  });

  it('detects no overlap when booking ends exactly when slot starts', () => {
    // slot 09:00-10:00, booking 08:00-09:00 — back to back, no overlap
    expect(hasOverlap(540, 600, 480, 540)).toBe(false);
  });

  it('detects no overlap when slot ends exactly when booking starts', () => {
    // slot 09:00-10:00, booking 10:00-11:00 — back to back, no overlap
    expect(hasOverlap(540, 600, 600, 660)).toBe(false);
  });

  it('detects no overlap for completely separate time ranges', () => {
    expect(hasOverlap(540, 600, 700, 760)).toBe(false);
  });
});