import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import Problem from '../../components/Problem.jsx';
import { istInputToApi, openPicker, toIstInput } from '../../data/format.js';
import { PROPERTY } from '../../data/hotel.js';
import { fieldWords } from '../../data/messages.js';
import { useApp } from '../../state/AppContext.jsx';

/** The answer to "check out": what to do before it, nothing more once the guest is out, or why not. */
function CheckoutResult({ answer }) {
  if (!answer) {
    return (
      <div className="result result-idle">
        <Icon name="door" size={28} />
        <p className="result-title">Check a guest out</p>
        <p className="result-text">The room turns dirty at once, and housekeeping sees it on the board.</p>
      </div>
    );
  }
  if (answer.status === 201) return null;
  return <div className="result result-no"><Problem answer={answer} /></div>;
}

/**
 * Pradeep at the desk: POST /checkouts closes the stay and makes the room dirty; "Next guest due" is the arrival
 * the room's readiness will be measured against.
 */
export default function Checkout() {
  const { post } = useApp();
  const [room, setRoom] = useState('');
  const [at, setAt] = useState(() => toIstInput(Date.now()));
  const [arrival, setArrival] = useState('');
  const [answer, setAnswer] = useState(null);
  const fieldErrors = fieldWords(answer);                     // each bad box's own sentence, shown under it

  async function checkout(e) {
    e.preventDefault();
    const body = { room: room.trim() };
    if (at) body.at = istInputToApi(at);                       // a blank time is left out, as a form would
    if (arrival) body.arrivalAt = istInputToApi(arrival);
    setAnswer(await post('/checkouts', body));
  }

  return (
    <div className="page is-fit">
      <div className="page-head">
        <div>
          <p className="eyebrow">{PROPERTY.name} · front desk</p>
          <h1 className="page-title">Check out</h1>
        </div>
      </div>

      <div className="split">
        <form className="card form" onSubmit={checkout} noValidate>
          <fieldset className="form-fields">
            <div className="field">
              <label className="field-label" htmlFor="co-room"><span className="step-no">1</span> Room</label>
              <div className={`input-wrap${fieldErrors.room ? ' has-error' : ''}`}>
                <input id="co-room" className="input mono" value={room} placeholder="214" autoComplete="off"
                  onChange={(e) => { setRoom(e.target.value); setAnswer(null); }} />
              </div>
              <p className={fieldErrors.room ? 'field-error' : 'field-help'}>{fieldErrors.room ?? 'Rooms 101–115 up to 401–415.'}</p>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="co-at"><span className="step-no">2</span> Checked out at <span className="muted">(India time)</span></label>
              <div className={`input-wrap${fieldErrors.at ? ' has-error' : ''}`}>
                <input id="co-at" onClick={openPicker} className="input mono" type="datetime-local" value={at} onChange={(e) => { setAt(e.target.value); setAnswer(null); }} />
              </div>
              <p className={fieldErrors.at ? 'field-error' : 'field-help'}>{fieldErrors.at ?? 'Filled in with now. Not in the future, not before the guest checked in.'}</p>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="co-arrival"><span className="step-no">3</span> Next guest due <span className="muted">(India time, optional)</span></label>
              <div className={`input-wrap${fieldErrors.arrivalAt ? ' has-error' : ''}`}>
                <input id="co-arrival" onClick={openPicker} className="input mono" type="datetime-local" value={arrival} onChange={(e) => { setArrival(e.target.value); setAnswer(null); }} />
              </div>
              <p className={fieldErrors.arrivalAt ? 'field-error' : 'field-help'}>
                {fieldErrors.arrivalAt ?? 'When the next guest for this room lands. The room’s margin is measured against it.'}
              </p>
            </div>
            <button type="submit" className="btn btn-primary btn-lg btn-block">Check out <Icon name="door" size={18} /></button>
          </fieldset>
        </form>
        <div className="result-slot"><CheckoutResult answer={answer} /></div>
      </div>
    </div>
  );
}