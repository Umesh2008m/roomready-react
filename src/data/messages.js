// Every refusal the backend can give, in the words of the person who meets it. The backend gives one shape (type,
// title, status, detail, and the refusal's own fields); this builds a sentence and a next step from the type and those
// fields, never from the backend's own wording.
import { PROPERTY, STATES, TYPES } from './hotel.js';

/** A list a person reads aloud: "a, b or c". */
const either = (xs) => `${xs.slice(0, -1).join(', ')} or ${xs.at(-1)}`;

/** The board's filters, said as the choices the screen offers. */
const STATE_CHOICES = either(STATES.filter((s) => s.id !== 'out_of_order').map((s) => s.name.toLowerCase()));

/** One bad filter, in the screen's own words. */
function fieldSays({ field }) {
  switch (field) {
    case 'floor': return 'Pick a floor: 1, 2, 3 or 4.';
    case 'state': return `Pick a state: ${STATE_CHOICES}.`;
    case 'type': return `Pick a type: ${either(TYPES)}.`;
    default: return 'Check the form and try again.';
  }
}

export function explain(answer) {
  const body = answer.body ?? {};
  switch (body.type) {
    case '/errors/validation': {
      // one sentence per field, said once even when a field breaks two rules
      const said = [...new Set((body.errors ?? []).map((e) => fieldSays(e)))];
      return { title: 'Something in the filters is not right', text: said.join(' ') || 'Check the form and try again.' };
    }
    case '/errors/no-such-property': return { title: 'That hotel is not here', text: `This board is ${PROPERTY.name} only.` };
    case '/errors/internal': return { title: 'Something went wrong', text: 'Please try again.' };
    default:
      return { title: 'That did not work', text: 'Check what you typed and try again.' };
  }
}