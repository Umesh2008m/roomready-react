// The "database": plain arrays, one per MERN collection, filled from seed.js when the page loads. It lives in memory
// for this page only, so a refresh starts a fresh hotel: every room occupied, nobody on a clean.
import { now } from './clock.js';
import { HOUSEKEEPERS, PROPERTY, ROOMS, staysAt } from './seed.js';

export const properties = [{ slug: PROPERTY.slug, name: PROPERTY.name }];
export const rooms = ROOMS.map((r) => ({ propertyId: PROPERTY.slug, ...r, outOfOrder: false }));
export const housekeepers = HOUSEKEEPERS.map((h) => ({ propertyId: PROPERTY.slug, ...h }));
export const stays = staysAt(now());
export const assignments = [];
export const inspections = [];
/** Append-only: a line is added with every change, and never changed or removed. */
export const events = [];

/** The room's current stay: its latest by check-in, or null. */
export function currentStay(propertyId, roomId) {
  const mine = stays.filter((s) => s.propertyId === propertyId && s.roomId === roomId);
  return mine.sort((a, b) => b.checkedInAt - a.checkedInAt)[0] ?? null;
}

/** The open assignment (closedAt null) of a stay, or null. */
export function openAssignment(propertyId, stayId) {
  return assignments.find((a) => a.propertyId === propertyId && a.stayId === stayId && a.closedAt === null) ?? null;
}

/** Writes the event of one change, with the change itself. */
export function record(event) {
  events.push({ assignmentId: null, data: {}, ...event });
}
