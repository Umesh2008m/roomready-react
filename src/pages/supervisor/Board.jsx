import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Dropdown from '../../components/Dropdown.jsx';
import Icon from '../../components/Icon.jsx';
import Problem from '../../components/Problem.jsx';
import RoomCell from '../../components/RoomCell.jsx';
import SectionTabs from '../../components/SectionTabs.jsx';
import { formatTime, istInputToApi, openPicker, toIstInput } from '../../data/format.js';
import { FLOORS, PROPERTY, STATES, TYPES } from '../../data/hotel.js';
import { explain } from '../../data/messages.js';
import { useApp, useGet } from '../../state/AppContext.jsx';

function Segmented({ label, options, value, onChange }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map(([id, text]) => (
        <button key={id || 'all'} type="button" aria-pressed={value === id}
          className={`seg${value === id ? ' is-on' : ''}`} onClick={() => onChange(id)}>
          {text}
        </button>
      ))}
    </div>
  );
}

/**
 * The Check out band on the board: Pradeep at the desk records the checkout (POST /checkouts, made as him), and the
 * room turns dirty on Grace's board at once. The answer's stay, time and state are shown here.
 */
function BoardCheckout() {
  const { post } = useApp();
  const [room, setRoom] = useState('');
  const [at, setAt] = useState(() => toIstInput(Date.now()));
  const [arrival, setArrival] = useState('');
  const [answer, setAnswer] = useState(null);

  async function checkout(e) {
    e.preventDefault();
    const body = { room: room.trim() };
    if (at) body.at = istInputToApi(at);                    // a blank time is left out, as a form would
    if (arrival) body.arrivalAt = istInputToApi(arrival);
    setAnswer(await post('/checkouts', body));
  }

  const ok = answer?.status === 201 ? answer.body : null;
  return (
    <form className="card board-checkout" onSubmit={checkout} noValidate aria-label="Check a guest out">
      <div className="board-checkout-head">
        <span className="board-checkout-title"><Icon name="door" size={16} /> Check out</span>
        <span className="muted">Pradeep at the front desk · times in India time</span>
      </div>
      <div className="board-checkout-fields">
        <label className="board-checkout-field"><span>Room</span>
          <input id="bc-room" className="board-checkout-input mono" value={room} placeholder="e.g. 214" inputMode="numeric"
            onChange={(e) => { setRoom(e.target.value); setAnswer(null); }} autoComplete="off" />
          <small className="board-checkout-help">The guest’s room number</small></label>
        <label className="board-checkout-field"><span>Checked out at</span>
          <input id="bc-at" onClick={openPicker} className="board-checkout-input mono" type="datetime-local" value={at} onChange={(e) => { setAt(e.target.value); setAnswer(null); }} />
          <small className="board-checkout-help">Filled in with now · change it if the guest left earlier</small></label>
        <label className="board-checkout-field"><span>Next guest due <span className="muted">(optional)</span></span>
          <input id="bc-arrival" onClick={openPicker} className="board-checkout-input mono" type="datetime-local" value={arrival} onChange={(e) => { setArrival(e.target.value); setAnswer(null); }} />
          <small className="board-checkout-help">When the next guest for this room arrives</small></label>
        <button type="submit" className="btn btn-primary">Check out <Icon name="door" size={16} /></button>
      </div>
      {ok && <p className="result-pill is-ok"><Icon name="check" size={16} strokeWidth={2.4} /><span>Room {ok.room} checked out at {formatTime(Date.parse(ok.checkedOutAt))} · stay {ok.stayId} · now {STATES.find((s) => s.id === ok.state)?.name.toLowerCase() ?? ok.state}.</span></p>}
      {answer && !ok && <div className="result-pill is-no"><Icon name="alert" size={16} /><div><strong>{explain(answer).title}</strong><p>{explain(answer).text}</p></div></div>}
    </form>
  );
}

/**
 * One room, read on its own from GET /properties/harbour-view/rooms/{no}. It takes the focus on its ✕ when it opens;
 * ✕, Esc or a click outside closes it, and the focus goes back to the door that opened it.
 */
function RoomDrawer({ no, onClose }) {
  const answer = useGet(`/properties/${PROPERTY.slug}/rooms/${no}`);
  const closeRef = useRef(null);

  useEffect(() => {
    const before = document.activeElement;
    closeRef.current?.focus({ preventScroll: true });
    return () => before?.focus?.({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const room = answer.status === 200 ? answer.body : null;
  const name = room && STATES.find((s) => s.id === room.state)?.name;
  return (
    <div className="drawer-scrim" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Room ${no}`} onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <div>
            <p className="eyebrow">{room ? `Floor ${room.floor} · ${room.type}` : 'Room'}</p>
            <h2 className="drawer-title">{no}</h2>
          </div>
          <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </header>
        {!room && <Problem answer={answer} />}
        {room && (
          <>
            <div className="drawer-room"><RoomCell room={room} /></div>
            <dl className="facts">
              <div><dt>State</dt><dd className={`state-word is-${room.state}`}>{name}</dd></div>
              {room.assignedTo && <div><dt>On it</dt><dd>{room.assignedTo}</dd></div>}
              {room.sinceMinutes != null && <div><dt>For</dt><dd className="mono">{room.sinceMinutes} min</dd></div>}
            </dl>
            {room.state === 'dirty' && <p className="drawer-empty">Dirty. <Link to={`/supervisor/work?room=${room.no}`}>Assign it on Work</Link>.</p>}
          </>
        )}
      </aside>
    </div>
  );
}

/**
 * Grace's board: GET /properties/harbour-view/rooms with the filters as query parameters, and the housekeepers
 * (GET …/housekeepers) beside it. The filters live in the address bar, so a board can be linked to, and a value the
 * backend refuses shows its refusal.
 */
export default function Board() {
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState(null);

  const floor = params.get('floor') ?? '';
  const state = params.get('state') ?? '';
  const type = params.get('type') ?? '';
  const query = new URLSearchParams();
  if (floor) query.set('floor', floor);
  if (state) query.set('state', state);
  if (type) query.set('type', type);
  const base = `/properties/${PROPERTY.slug}/rooms`;
  const path = `${base}${query.toString() ? `?${query}` : ''}`;
  const answer = useGet(path);
  const everything = useGet(base);
  const staffAnswer = useGet(`/properties/${PROPERTY.slug}/housekeepers`);
  const all = everything.status === 200 ? everything.body.rooms : [];
  const shown = answer.status === 200 ? answer.body.rooms : [];
  const count = (s) => all.filter((r) => r.state === s).length;
  const staff = staffAnswer.status === 200 ? staffAnswer.body.housekeepers : null;

  function setFilter(name, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next);
  }

  return (
    <div className="page is-fit">
      <div className="page-head">
        <div>
          <p className="eyebrow">{PROPERTY.name} · this morning</p>
          <h1 className="page-title">The board</h1>
        </div>
        <SectionTabs personaId="supervisor" />
      </div>

      {everything.status === 200 && (
        <div className="stats" style={{ '--stat-cols': 6 }}>
          <div className="stat"><span className="stat-label">Rooms</span><strong className="stat-value">{all.length}</strong><span className="stat-note">40 Standard · 12 Deluxe · 8 Suite</span></div>
          <div className="stat"><span className="stat-label">Ready</span><strong className="stat-value is-free">{everything.body.ready}</strong><span className="stat-note">for the next guest</span></div>
          <div className={`stat${everything.body.dirty ? ' is-alert' : ''}`}><span className="stat-label">Dirty</span><strong className="stat-value">{everything.body.dirty}</strong><span className="stat-note">waiting for a housekeeper</span></div>
          <div className="stat"><span className="stat-label">Being cleaned</span><strong className="stat-value">{count('assigned') + count('cleaning')}</strong><span className="stat-note">assigned or cleaning</span></div>
          <div className="stat"><span className="stat-label">To inspect</span><strong className="stat-value">{count('toinspect')}</strong><span className="stat-note">somebody else signs off</span></div>
          <div className="stat"><span className="stat-label">On time</span><strong className="stat-value is-free">—</strong><span className="stat-note">once a room is ready for a known guest</span></div>
        </div>
      )}

      <div className="toolbar">
        <Segmented label="Floor" value={floor} onChange={(v) => setFilter('floor', v)}
          options={[['', 'All floors'], ...FLOORS.map((f) => [String(f), `Floor ${f}`])]} />
        <Segmented label="Type" value={type} onChange={(v) => setFilter('type', v)}
          options={[['', 'Any type'], ...TYPES.map((t) => [t, t])]} />
        <div className="toolbar-select">
          <Dropdown label="State" value={state} onChange={(v) => setFilter('state', v)}
            options={[{ value: '', label: 'Any state' }, ...STATES.filter((s) => s.id !== 'out_of_order').map((s) => ({ value: s.id, label: s.name }))]} />
        </div>
        {(floor || state || type) && answer.status === 200 && (
          <p className="filter-count" aria-live="polite">
            <strong>{shown.length}</strong> shown · <strong className="is-free">{answer.body.ready}</strong> ready · <strong>{answer.body.dirty}</strong> dirty
          </p>
        )}
      </div>

      <BoardCheckout />

      <div className="staff-strip" aria-label="Housekeepers">
        <span className="staff-strip-label">Housekeepers</span>
        {!staff ? <Problem answer={staffAnswer} compact /> : staff.map((h) => {
          const room = h.openAssignment;
          return (
            <span key={h.id} className="staff-chip">
              <span className="staff-code mono">{h.id}</span>
              <span>{h.name}</span>
              <span className={`staff-room mono${room ? ' is-on' : ''}`}>{room ?? 'free'}</span>
            </span>
          );
        })}
      </div>

      <div>
        {answer.status === 0 ? null : answer.status !== 200 ? (
          <Problem answer={answer}>
            <Link to="/supervisor/board" className="btn btn-soft problem-action">Show the whole hotel</Link>
          </Problem>
        ) : shown.length === 0 ? (
          <div className="empty">
            <Icon name="grid" size={28} />
            <p className="empty-title">No room matches these filters</p>
            <p className="empty-text">Change the floor, the type or the state to see more of the hotel.</p>
          </div>
        ) : (
          <div className="hotel">
            {FLOORS.map((f) => {
              const rooms = shown.filter((r) => r.floor === f);
              if (rooms.length === 0) return null;
              return (
                <section key={f} className="corridor" aria-label={`Floor ${f}`}>
                  <header className="corridor-head">
                    <span>Floor {f}</span>
                    <span className="mono">{rooms.filter((r) => r.state === 'ready').length} ready · {rooms.filter((r) => r.state === 'dirty').length} dirty</span>
                  </header>
                  <div className="corridor-row">
                    {rooms.map((r, i) => (
                      <RoomCell key={r.no} room={r} selected={r.no === selected} onClick={() => setSelected(r.no)} style={{ '--i': i }} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <ul className="legend legend-below legend-wrap" aria-label="Legend">
        {STATES.filter((s) => s.id !== 'out_of_order').map((s) => <li key={s.id}><span className="dot is-${s.id}" /> {s.name}</li>)}
      </ul>

      {selected && <RoomDrawer no={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}