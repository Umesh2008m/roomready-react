// Dates and times in India time (IST, UTC+05:30, no daylight saving): the hotel's own clock. The backend keeps
// every instant in UTC, so its answers carry the same moment with a Z.
const ZONE = 'Asia/Kolkata';
const IST_MS = 330 * 60 * 1000;

/** A datetime-local value for this moment, to the minute, in India time. */
export function toIstInput(ms) {
  return new Date(ms + IST_MS).toISOString().slice(0, 16);
}

/** A typed India time (datetime-local) as the API writes it: UTC, to the second, with Z. */
export function istInputToApi(typed) {
  const ms = Date.parse(`${typed}:00+05:30`);
  return Number.isNaN(ms) ? `${typed}:00Z` : new Date(ms).toISOString().replace('.000Z', 'Z');
}

export function formatTime(ms) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', hour12: false })
    .format(ms);
}

function formatDay(ms) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, weekday: 'short', day: 'numeric', month: 'short' })
    .format(ms);
}

export function formatWhen(ms) {
  return `${formatDay(ms)}, ${formatTime(ms)}`;
}

/** Click anywhere in a date-time box: its calendar opens (where the browser can show it on request). */
export function openPicker(e) {
  try { e.currentTarget.showPicker?.(); } catch { /* not allowed here: the box still takes typing */ }
}