// The starting data, the same records as the MERN backend's seed (seed/rooms.csv and seed/housekeepers.csv): Harbour
// View, its 60 rooms on four floors and its nine housekeepers. Every room has one guest, checked in a day before the
// page was opened, to the whole second.
export const PROPERTY = { slug: 'harbour-view', name: 'Harbour View' };

const DAY = 24 * 60 * 60 * 1000;

/** Each floor has rooms 01 to 15: ten Standard (01–10), two Suites (11, 12) and three Deluxe (13–15). */
function typeOf(n) {
  if (n <= 10) return 'Standard';
  return n <= 12 ? 'Suite' : 'Deluxe';
}

export const ROOMS = [1, 2, 3, 4].flatMap((floor) => Array.from({ length: 15 }, (_, i) => ({
  no: `${floor}${String(i + 1).padStart(2, '0')}`, floor, type: typeOf(i + 1),
})));

export const HOUSEKEEPERS = [
  { id: 'HK01', name: 'Grace' },
  { id: 'HK02', name: 'Asha' },
  { id: 'HK03', name: 'Sunita' },
  { id: 'HK04', name: 'Devi' },
  { id: 'HK05', name: 'Meena' },
  { id: 'HK06', name: 'Lakshmi' },
  { id: 'HK07', name: 'Rekha' },
  { id: 'HK08', name: 'Priya' },
  { id: 'HK09', name: 'Kavita' },
];

/** One stay per room, checked in a day before `now`: ST0001 for room 101, and so on. */
export function staysAt(now) {
  const checkedInAt = new Date(Math.floor((now.getTime() - DAY) / 1000) * 1000);
  return ROOMS.map((r, i) => ({
    propertyId: PROPERTY.slug, roomId: r.no, stayId: `ST${String(i + 1).padStart(4, '0')}`, guestRef: `guest-${r.no}`,
    checkedInAt, checkedOutAt: null, arrivalAt: null, readyAt: null, marginMinutes: null,
  }));
}
