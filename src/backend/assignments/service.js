// A clean: a dirty room is assigned to a housekeeper, who starts it and finishes it. Every room type then waits for
// an inspection (the MERN backend's default, INSPECTION_REQUIRED_FOR=Standard,Deluxe,Suite).
import { iso, now, wholeSecond } from '../clock.js';
import { alreadyAssigned, noSuchAssignment, noSuchHousekeeper, noSuchRoom, stepSkipped } from '../errors.js';
import { assignments, housekeepers, record, rooms } from '../store.js';
import { NEEDS, whereIs } from '../rooms/state.js';

const PROPERTY = 'harbour-view';

/** Where the room numbered `no` is now; a room that does not exist is refused. */
function whereIsRoom(no) {
  const room = rooms.find((r) => r.propertyId === PROPERTY && r.no === no);
  if (!room) throw noSuchRoom(no);
  return whereIs(PROPERTY, room);
}

const housekeeper = (id) => housekeepers.find((h) => h.propertyId === PROPERTY && h.id === id) ?? null;

/** The room must be in `wanted`; otherwise the step is skipped, saying where it is and what comes first. */
function mustBe(state, wanted) {
  if (state !== wanted) throw stepSkipped(state, NEEDS[state]);
}

/** The event of a step of this assignment, done by its housekeeper. */
function eventOf(assignment, kind, at, data = {}) {
  return {
    propertyId: PROPERTY, roomId: assignment.roomId, stayId: assignment.stayId, assignmentId: assignment.assignmentId,
    kind, at, actorId: assignment.housekeeperId, data,
  };
}

function requireAssignment(id) {
  const assignment = assignments.find((a) => a.propertyId === PROPERTY && a.assignmentId === id);
  if (!assignment) throw noSuchAssignment(id);
  return assignment;
}

/** A dirty room is given to a housekeeper; a room that already has an open assignment is refused, naming hers. */
export function assign({ room: no, housekeeper: housekeeperId }) {
  const { stay, open, state } = whereIsRoom(no);
  const chosen = housekeeper(housekeeperId);
  if (!chosen) throw noSuchHousekeeper(housekeeperId);
  if (open) throw alreadyAssigned(housekeeper(open.housekeeperId).name);
  mustBe(state, 'dirty');
  const assignedAt = wholeSecond(now());
  // the next assignment id in the property: 'AS' and a number of at least three digits, AS001 first
  const assignmentId = `AS${String(assignments.filter((a) => a.propertyId === PROPERTY).length + 1).padStart(3, '0')}`;
  const assignment = {
    propertyId: PROPERTY, roomId: no, stayId: stay.stayId, assignmentId, housekeeperId, assignedAt,
    startedAt: null, finishedAt: null, cleanMinutes: null, closedAt: null,
  };
  assignments.push(assignment);
  record(eventOf(assignment, 'assigned', assignedAt, { housekeeper: housekeeperId }));
  return { assignmentId, room: no, assignedTo: chosen.name, assignedAt: iso(assignedAt) };
}

/** The housekeeper starts cleaning an assigned room. */
export function start(id) {
  const assignment = requireAssignment(id);
  mustBe(whereIsRoom(assignment.roomId).state, 'assigned');
  const startedAt = wholeSecond(now());
  assignment.startedAt = startedAt;
  record(eventOf(assignment, 'started', startedAt));
  return { assignmentId: id, startedAt: iso(startedAt) };
}

/** The clean is done: its duration (whole minutes, by the clock) is stored once, never recomputed. */
export function finish(id) {
  const assignment = requireAssignment(id);
  mustBe(whereIsRoom(assignment.roomId).state, 'cleaning');
  const finishedAt = wholeSecond(now());
  const cleanMinutes = Math.floor((finishedAt.getTime() - assignment.startedAt.getTime()) / 60000);
  assignment.finishedAt = finishedAt;
  assignment.cleanMinutes = cleanMinutes;
  record(eventOf(assignment, 'finished', finishedAt, { cleanMinutes }));
  return { assignmentId: id, finishedAt: iso(finishedAt), cleanMinutes };
}
