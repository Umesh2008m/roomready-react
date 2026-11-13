// The board, one room, the housekeepers and a room's day: the reads every screen starts from.
import { iso, now } from '../clock.js';
import { noSuchProperty, noSuchRoom } from '../errors.js';
import * as store from '../store.js';
import { since, whereIs } from './state.js';

function requireProperty(property) {
  if (!store.properties.some((p) => p.slug === property)) throw noSuchProperty(property);
}

/** A property's rooms in room-number order. */
const roomsOf = (property) => store.rooms.filter((r) => r.propertyId === property).sort((a, b) => a.no.localeCompare(b.no));

/** A room as the board shows it: who is on it and since when (whole minutes, by the clock). */
function shape(property, room) {
  const { open, state } = whereIs(property, room);
  const shaped = { no: room.no, floor: room.floor, type: room.type, state, assignedTo: null };
  const from = since(state, open);
  if (!from) return shaped;
  const sinceMinutes = Math.floor((now().getTime() - from.getTime()) / 60000);
  const name = store.housekeepers.find((h) => h.id === open.housekeeperId).name;
  return { ...shaped, assignedTo: name, sinceMinutes };
}

/** The board, optionally one floor, state and/or type; `ready` and `dirty` count the rooms shown. */
export function board(property, { floor, state, type } = {}) {
  requireProperty(property);
  const rooms = roomsOf(property).map((r) => shape(property, r))
    .filter((r) => (!floor || r.floor === floor) && (!state || r.state === state) && (!type || r.type === type));
  const count = (s) => rooms.filter((r) => r.state === s).length;
  return { property, ready: count('ready'), dirty: count('dirty'), rooms };
}

export function room(property, no) {
  requireProperty(property);
  const found = store.rooms.find((r) => r.propertyId === property && r.no === no);
  if (!found) throw noSuchRoom(no);
  return shape(property, found);
}

/** The housekeepers, each with the room number of her open assignment, or null. */
export function housekeepers(property) {
  requireProperty(property);
  const open = new Map(roomsOf(property).map((r) => whereIs(property, r))
    .filter((w) => w.open).map((w) => [w.open.housekeeperId, w.room.no]));
  const list = store.housekeepers.filter((h) => h.propertyId === property).sort((a, b) => a.id.localeCompare(b.id));
  return { housekeepers: list.map((h) => ({ id: h.id, name: h.name, openAssignment: open.get(h.id) || null })) };
}

/** A history line: when, what, and the event's facts (times as ISO strings). */
function line(event) {
  const facts = Object.entries(event.data).map(([k, v]) => [k, v instanceof Date ? iso(v) : v]);
  return { at: iso(event.at), kind: event.kind, ...Object.fromEntries(facts) };
}

/** The current stay's events in this room, in `at` order (same-time events in the order they were written). */
export function history(property, no) {
  requireProperty(property);
  if (!store.rooms.some((r) => r.propertyId === property && r.no === no)) throw noSuchRoom(no);
  const stay = store.currentStay(property, no)?.stayId;
  const lines = store.events.filter((e) => e.propertyId === property && e.roomId === no && e.stayId === stay)
    .sort((a, b) => a.at - b.at);
  return { room: no, events: lines.map(line) };
}
