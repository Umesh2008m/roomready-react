// A guest leaves: the front desk's checkout makes the room dirty.
import { iso, now, wholeSecond } from '../clock.js';
import { noSuchRoom, roomNotOccupied, validation } from '../errors.js';
import { currentStay, record, rooms } from '../store.js';

const PROPERTY = 'harbour-view';
/** Nobody logs in: a checkout is made by the front desk. */
const FRONT_DESK = 'front-desk';

/** A time rule broken: answered like any malformed body, naming the field. */
const invalid = (field, message) => validation([{ field, message }]);

/**
 * The guest in this room leaves at `at`: the stay is checked out and the room becomes dirty. Refused if the room has
 * no guest; the times must make sense by the clock: not in the future, not before check-in, an arrival not before
 * the checkout.
 */
export function checkout({ room: no, at, arrivalAt }) {
  if (!rooms.some((r) => r.propertyId === PROPERTY && r.no === no)) throw noSuchRoom(no);
  const stay = currentStay(PROPERTY, no);
  if (!stay || stay.checkedOutAt !== null) throw roomNotOccupied(no);
  const checkedOutAt = wholeSecond(new Date(at));
  if (checkedOutAt > now()) throw invalid('at', 'must not be in the future');
  if (checkedOutAt < stay.checkedInAt) throw invalid('at', 'must not be before the check-in');
  const arrival = arrivalAt ? wholeSecond(new Date(arrivalAt)) : null;
  if (arrival && arrival < checkedOutAt) throw invalid('arrivalAt', 'must not be before the checkout');
  stay.checkedOutAt = checkedOutAt;
  stay.arrivalAt = arrival;
  record({ propertyId: PROPERTY, roomId: no, stayId: stay.stayId, kind: 'checked_out', at: checkedOutAt, actorId: FRONT_DESK });
  return { stayId: stay.stayId, room: no, checkedOutAt: iso(checkedOutAt), state: 'dirty' };
}
