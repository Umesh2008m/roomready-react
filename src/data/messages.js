// Every refusal the backend can give, in the words of the person who meets it. The backend gives one shape (type,
// title, status, detail, and the refusal's own fields); this builds a sentence and a next step from the type and those
// fields, never from the backend's own wording.
import { PROPERTY, STATES, TYPES } from './hotel.js';

/** Where a room is, as a person says it, for a step that came too early or too late. */
const IS = {
  occupied: 'This room still has its guest',
  assigned: 'This room is assigned, but its clean has not started',
  cleaning: 'This room is already being cleaned',
  toinspect: 'This room is waiting for inspection',
  ready: 'This room is already ready',
  out_of_order: 'This room is out of order',
};

/** What has to happen first, for each step the room needs. */
const FIRST = {
  checkout: 'check the guest out first',
  start: 'start the clean first',
  finish: 'finish the clean first',
  inspect: 'inspect it first',
  checkin: 'nothing more is needed until the next guest checks in',
};

/** A list a person reads aloud: "a, b or c". */
const either = (xs) => `${xs.slice(0, -1).join(', ')} or ${xs.at(-1)}`;

/** The board's filters, said as the choices the screen offers. */
const STATE_CHOICES = either(STATES.filter((s) => s.id !== 'out_of_order').map((s) => s.name.toLowerCase()));

/** One bad field of a form or a filter, in the screen's own words. `form` is where it was sent (the answer's instance). */
function fieldSays(form, { field, message }) {
  switch (field) {
    case 'room': return form === '/checkouts' ? 'Type the room number first.' : 'Pick a room first.';
    case 'at':
      if (message.includes('future')) return 'The checkout time cannot be in the future.';
      if (message.includes('check-in')) return 'The checkout time cannot be before the guest checked in.';
      if (message === 'Required') return 'Fill in when the guest checked out.';
      return 'Type when the guest checked out as a full date and time.';
    case 'arrivalAt':
      if (message.includes('checkout')) return 'The next guest cannot be due before the checkout.';
      return 'Type when the next guest is due as a full date and time.';
    case 'housekeeper': return 'Pick a housekeeper first.';
    case 'floor': return 'Pick a floor: 1, 2, 3 or 4.';
    case 'state': return `Pick a state: ${STATE_CHOICES}.`;
    case 'type': return `Pick a type: ${either(TYPES)}.`;
    default: return 'Check the form and try again.';
  }
}

/** The words for each bad field of a refused form, by field, to show under its box. */
export function fieldWords(answer) {
  const body = answer?.body ?? {};
  if (body.type !== '/errors/validation') return {};
  return Object.fromEntries((body.errors ?? []).map((e) => [e.field, fieldSays(body.instance, e)]));
}

export function explain(answer) {
  const body = answer.body ?? {};
  switch (body.type) {
    case '/errors/validation': {
      const onBoard = /\/rooms$/.test(body.instance ?? '');
      // one sentence per field, said once even when a field breaks two rules
      const said = [...new Set((body.errors ?? []).map((e) => fieldSays(body.instance, e)))];
      return {
        title: onBoard ? 'Something in the filters is not right' : 'Something in the form is not right',
        text: said.join(' ') || 'Check the form and try again.',
      };
    }
    case '/errors/room-not-occupied': return { title: 'Nobody is in that room', text: 'This room has no guest to check out. It was already checked out.' };
    case '/errors/step-skipped': {
      const first = FIRST[body.needs];
      return { title: 'A step was skipped', text: `${IS[body.state] ?? 'This room is not ready for that step'}${first ? `; ${first}` : ''}.` };
    }
    case '/errors/already-assigned':
      return { title: 'Somebody is already on that room', text: body.assignedTo
        ? `This room is already ${body.assignedTo}’s; it goes to one housekeeper at a time.`
        : 'This room already has a housekeeper on it.' };
    case '/errors/self-inspection': return { title: 'Somebody else must inspect it', text: 'The inspector cleaned this room; somebody else must inspect it.' };
    case '/errors/no-such-room': return { title: 'No such room', text: 'There is no room with that number. Rooms run 101–115 up to 401–415.' };
    case '/errors/no-such-housekeeper': return { title: 'No such housekeeper', text: 'There is no housekeeper with that code. Codes run HK01 to HK09.' };
    case '/errors/no-such-assignment': return { title: 'No such assignment', text: 'There is no assignment with that code. Assigning a room gives it one, like AS001.' };
    case '/errors/no-such-property': return { title: 'That hotel is not here', text: `This board is ${PROPERTY.name} only.` };
    case '/errors/internal': return { title: 'Something went wrong', text: 'Please try again.' };
    default:
      return { title: 'That did not work', text: 'Check what you typed and try again.' };
  }
}