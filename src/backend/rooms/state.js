// A room's state, derived from where it is in the sequence: never stored.
import { currentStay, openAssignment } from '../store.js';

/**
 * `stay` is the room's current stay, `assignment` the open assignment of that stay (or null). A stay stamped ready by
 * a passed inspection makes the room ready.
 */
export function stateOf(room, stay, assignment) {
  if (room.outOfOrder) return 'out_of_order';
  if (!stay || stay.checkedOutAt === null) return 'occupied';
  if (!assignment) return stay.readyAt ? 'ready' : 'dirty';
  if (assignment.startedAt === null) return 'assigned';
  return assignment.finishedAt === null ? 'cleaning' : 'toinspect';
}

/** The step that must come first, for each state. */
export const NEEDS = {
  occupied: 'checkout', dirty: 'assign', assigned: 'start', cleaning: 'finish', toinspect: 'inspect', ready: 'checkin',
};

/** The assignment stamp each state starts from. */
const STARTS_AT = { assigned: 'assignedAt', cleaning: 'startedAt', toinspect: 'finishedAt' };

/** When the room entered its current state, for the states an assignment stamps; null for the others. */
export function since(state, assignment) {
  return assignment && STARTS_AT[state] ? assignment[STARTS_AT[state]] : null;
}

/** Whole minutes from ready to the guest's arrival (negative when late); null when no arrival is known. */
export function marginOf(readyAt, arrivalAt) {
  return arrivalAt ? Math.round((arrivalAt.getTime() - readyAt.getTime()) / 60000) : null;
}

/** Where a room is now: the room, its current stay, the stay's open assignment and the derived state. */
export function whereIs(propertyId, room) {
  const stay = currentStay(propertyId, room.no);
  const open = stay ? openAssignment(propertyId, stay.stayId) : null;
  return { room, stay, open, state: stateOf(room, stay, open) };
}
