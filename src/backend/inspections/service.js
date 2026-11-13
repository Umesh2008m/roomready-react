// Somebody other than the cleaner inspects the room: a pass makes it ready, with its margin before the next guest.
import { iso, now, wholeSecond } from '../clock.js';
import { noSuchHousekeeper, noSuchRoom, selfInspection, stepSkipped } from '../errors.js';
import { housekeepers, inspections, record, rooms } from '../store.js';
import { marginOf, NEEDS, whereIs } from '../rooms/state.js';

const PROPERTY = 'harbour-view';

const housekeeper = (id) => housekeepers.find((h) => h.propertyId === PROPERTY && h.id === id) ?? null;

/** The room waiting for inspection: its stay and open assignment, or a refusal saying where it is instead. */
function waitingRoom(no) {
  const room = rooms.find((r) => r.propertyId === PROPERTY && r.no === no);
  if (!room) throw noSuchRoom(no);
  const { stay, open, state } = whereIs(PROPERTY, room);
  if (state !== 'toinspect') throw stepSkipped(state, NEEDS[state]);
  return { stay, assignment: open };
}

/** What the inspected event records: who inspected and the result; for a pass, the margin and the arrival. */
function inspectedData(inspectorId, result, { marginMinutes, arrivalAt }) {
  return result === 'pass' ? { inspector: inspectorId, result, marginMinutes, arrivalAt } : { inspector: inspectorId, result };
}

/**
 * The inspection is recorded, a pass stamps the stay ready with its margin before arrival, the assignment is closed,
 * and the inspected event is written. A fail makes the room dirty again, for a new assignment.
 */
export function inspect({ room: no, inspector: inspectorId, result }) {
  const { stay, assignment } = waitingRoom(no);
  const inspector = housekeeper(inspectorId);
  if (!inspector) throw noSuchHousekeeper(inspectorId);
  if (inspectorId === assignment.housekeeperId) throw selfInspection();
  const inspectedAt = wholeSecond(now());
  // the next inspection id in the property: 'IN' and a number of at least three digits, IN001 first
  const inspectionId = `IN${String(inspections.filter((i) => i.propertyId === PROPERTY).length + 1).padStart(3, '0')}`;
  const marginMinutes = marginOf(inspectedAt, stay.arrivalAt);
  inspections.push({
    propertyId: PROPERTY, roomId: no, assignmentId: assignment.assignmentId, inspectionId, inspectorId, result, inspectedAt,
  });
  if (result === 'pass') {
    stay.readyAt = inspectedAt;
    stay.marginMinutes = marginMinutes;
  }
  assignment.closedAt = inspectedAt;
  record({
    propertyId: PROPERTY, roomId: no, stayId: stay.stayId, assignmentId: assignment.assignmentId, kind: 'inspected',
    at: inspectedAt, actorId: inspectorId, data: inspectedData(inspectorId, result, { marginMinutes, arrivalAt: stay.arrivalAt }),
  });
  const out = { inspectionId, room: no, cleanedBy: housekeeper(assignment.housekeeperId).name, inspectedBy: inspector.name, result };
  if (result === 'fail') return { ...out, state: 'dirty' };
  return { ...out, state: 'ready', readyAt: iso(inspectedAt), arrivalAt: stay.arrivalAt && iso(stay.arrivalAt), marginMinutes };
}
