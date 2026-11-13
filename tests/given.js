// Puts the hotel into a state before a screen opens, and sets the clock, the way the ticket's "Given" says.
// Everything goes through the api the screens use; nothing here looks inside the app.
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;

/** Wednesday 4 November 2026, 09:00 in the hotel (India time): a morning of checkouts. */
export const WED_0900 = new Date('2026-11-04T09:00:00+05:30');

/** Puts the clock at this moment; it keeps running on from there. */
export function clockAt(when) {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(when);
}

/**
 * Lets this much time pass on the clock, timers included, in small steps: between steps the screen gets to draw,
 * so a timer that a screen starts also runs within the time.
 */
export async function wait(ms) {
  for (let left = ms; left > 0; left -= 100) await vi.advanceTimersByTimeAsync(Math.min(100, left));
}

/** Moves only the time of day on, firing nothing. */
export function jump(ms) {
  vi.setSystemTime(new Date(Date.now() + ms));
}

/** A person at the keyboard and mouse; works with the clock set or not. */
export function person() {
  return userEvent.setup({ advanceTimers: (ms) => (vi.isFakeTimers() ? vi.advanceTimersByTime(ms) : undefined) });
}

async function ok(answer, what) {
  const { status, body } = await answer;
  if (status >= 300) throw new Error(`${what} was refused: ${JSON.stringify(body)}`);
  return body;
}

/** The time as the API writes it, to the whole second. */
const stamp = (date) => new Date(Math.floor(date.getTime() / 1000) * 1000).toISOString().replace('.000Z', 'Z');

/** The guest of this room leaves now (or at `at`), with the next guest's arrival if given. */
export function checkOut(api, room, { at = new Date(), arrivalAt } = {}) {
  const body = { room, at: stamp(at) };
  if (arrivalAt) body.arrivalAt = stamp(arrivalAt);
  return ok(api.post('/checkouts', body), `the checkout of ${room}`);
}

/** A dirty room goes to a housekeeper (HK03 is Sunita); answers the assignment id. */
export async function assign(api, room, housekeeper) {
  const body = await ok(api.post('/assignments', { room, housekeeper }), `assigning ${room}`);
  return body.assignmentId;
}

export const start = (api, id) => ok(api.post(`/assignments/${id}/start`), `starting ${id}`);
export const finish = (api, id) => ok(api.post(`/assignments/${id}/finish`), `finishing ${id}`);

export function inspect(api, room, inspector, result) {
  return ok(api.post('/inspections', { room, inspector, result }), `inspecting ${room}`);
}

/** Checked out, assigned, started and finished: the room waits for inspection. Answers the assignment id. */
export async function cleaned(api, room, housekeeper, checkout = {}) {
  await checkOut(api, room, checkout);
  const id = await assign(api, room, housekeeper);
  await start(api, id);
  await finish(api, id);
  return id;
}

/** All the way to ready: cleaned by one housekeeper, passed by another. */
export async function madeReady(api, room, housekeeper, inspector, checkout = {}) {
  await cleaned(api, room, housekeeper, checkout);
  return inspect(api, room, inspector, 'pass');
}

/** The room numbers from one to another, as the ticket gives a range: roomsFrom('209', '215') is 209, 210 … 215. */
export function roomsFrom(first, last) {
  const a = Number(first);
  const b = Number(last);
  return Array.from({ length: b - a + 1 }, (_, i) => String(a + i));
}
