import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import Problem from './Problem.jsx';
import ScrollThumb from './ScrollThumb.jsx';
import { formatTime, formatWhen } from '../data/format.js';
import { PROPERTY } from '../data/hotel.js';
import { useGet } from '../state/AppContext.jsx';

/** The margin, as Mr Menon reads it: minutes before the guest, or after (late). */
export function marginText(minutes) {
  if (minutes == null) return 'no arrival known';
  return minutes >= 0 ? `${minutes} min before the guest` : `${-minutes} min after the guest`;
}

/** What each kind of event line says. Events carry ids and facts, never the guest; `nameOf` turns a code into a name. */
function eventText(e, nameOf) {
  switch (e.kind) {
    case 'checked_out': return { icon: 'door', title: 'Guest checked out', note: 'the room is dirty' };
    case 'assigned': return { icon: 'users', title: `Assigned to ${nameOf(e.housekeeper)}`, note: e.housekeeper };
    case 'started': return { icon: 'clock', title: 'Clean started' };
    case 'finished': return { icon: 'sparkle', title: 'Clean finished', note: `${e.cleanMinutes} min` };
    case 'inspected': {
      const pass = e.result === 'pass';
      return { icon: pass ? 'check' : 'x', title: `${pass ? 'Passed' : 'Failed'} by ${nameOf(e.inspector)}`,
        note: pass ? `ready · ${marginText(e.marginMinutes)}` : 'back to dirty' };
    }
    default: return { icon: 'list', title: 'A step was recorded' };
  }
}

/**
 * One room's day (GET …/rooms/{no}/history), opened like a clipboard page over the screen you are on. Every line
 * was written with the change itself; nothing is re-ticked or wiped. Close it (×, Esc, a click outside) and you are
 * where you were.
 */
export default function RoomNotebook({ no, onClose }) {
  const answer = useGet(`/properties/${PROPERTY.slug}/rooms/${no}/history`);
  const staff = useGet(`/properties/${PROPERTY.slug}/housekeepers`).body?.housekeepers ?? [];
  const nameOf = (code) => staff.find((h) => h.id === code)?.name ?? code;
  const [closing, setClosing] = useState(false);
  const closeRef = useRef(null);
  const pageRef = useRef(null);
  const day = answer.status === 200 ? answer.body : null;

  function close() {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 220);
  }

  useEffect(() => {
    const before = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
      before?.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const last = day?.events.at(-1);

  return (
    <div className={`nb-scrim${closing ? ' is-closing' : ''}`} onClick={close}>
      <div className="nb-book" role="dialog" aria-modal="true" aria-labelledby="nb-title" onClick={(e) => e.stopPropagation()}>
        <div className="nb-cover" aria-hidden="true">
          <span className="nb-cover-label">
            <span className="nb-cover-small">{PROPERTY.name}</span>
            <span className="nb-cover-big">The room’s day</span>
          </span>
        </div>

        <div ref={pageRef} className="nb-page">
          <div className="nb-rings" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span key={i} />)}</div>

          <header className="nb-head">
            <div>
              <p className="nb-eyebrow">The room’s day · {PROPERTY.name}</p>
              <h2 id="nb-title" className="nb-title mono">Room {no}</h2>
            </div>
            {last && <span className={`nb-stamp tone-${last.kind === 'inspected' && last.result === 'pass' ? 'go' : 'muted'}`}>{eventText(last, nameOf).title.split(' ')[0]}</span>}
            <button ref={closeRef} type="button" className="nb-close" onClick={close} aria-label="Close the notebook">
              <Icon name="x" size={18} />
            </button>
          </header>

          {answer.status === 0 ? null : !day ? (
            <div className="nb-blank">
              <p className="nb-hand">No page for room “{no}”.</p>
              <Problem answer={answer} compact />
            </div>
          ) : day.events.length === 0 ? (
            <div className="nb-blank">
              <p className="nb-hand">Nothing has happened to this stay yet.</p>
              <p className="nb-help">A line is written when the guest checks out, and at every step after that.</p>
            </div>
          ) : (
            <>
              <div className="nb-section">
                <h3 className="nb-hand">What happened</h3>
                <span className="nb-lock"><Icon name="lock" size={13} /> Can’t be re-ticked</span>
              </div>
              <ol className="nb-lines">
                {day.events.map((event, i) => {
                  const text = eventText(event, nameOf);
                  return (
                    <li key={i} className={`nb-line kind-${event.kind}`} style={{ '--i': i }}>
                      <span className="nb-icon"><Icon name={text.icon} size={14} /></span>
                      <span className="nb-text">
                        <strong>{text.title}</strong>
                        <span className="nb-note">
                          <time>{formatWhen(Date.parse(event.at))}</time>{text.note && ` · ${text.note}`}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </>
          )}

          <aside className="nb-tip">
            <p className="nb-tip-title"><Icon name="book" size={15} /> How this page works</p>
            <p>Every step a room goes through adds a line here, written together with the step itself, with who did it. A refused step leaves no line. Lines are only ever added: when a guest is sent to an unclean room, this page says who signed it off and when.</p>
            <p className="nb-tip-small">It opens over the page you are on. Close it with ×, Esc or a click outside and you are right where you were. {last && `Last line at ${formatTime(Date.parse(last.at))}.`}</p>
          </aside>
        </div>
        <ScrollThumb target={pageRef} />
      </div>
    </div>
  );
}