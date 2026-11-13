import { useEffect, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import RoomCell from '../../components/RoomCell.jsx';
import { formatTime } from '../../data/format.js';
import { PROPERTY } from '../../data/hotel.js';

/**
 * After a checkout: the desk takes back the key card, and the room's door turns dirty for housekeeping.
 *   'key'      the guest's key card waits on the desk; drag it onto the room's door (or tap it)
 *   'turning'  the key is back; the door's strip turns from occupied to dirty
 *   'done'     done; OK clears the form for the next guest.
 * The room was made dirty by the checkout itself (the answer's state); this only shows it happen. Drag and drop is
 * HTML's own; tapping the card does the same, because phones do not drag.
 */
export default function ReturnKey({ checkout, room, nextGuest, onDone }) {
  const [stage, setStage] = useState('key');
  const [dragging, setDragging] = useState(false);
  const [over, setOver] = useState(false);

  function takeKey() {
    if (stage !== 'key') return;
    setOver(false);
    setDragging(false);
    setStage('turning');
  }

  // The door turns by itself once the key is back.
  useEffect(() => {
    if (stage !== 'turning') return undefined;
    const timer = setTimeout(() => setStage('done'), 900);
    return () => clearTimeout(timer);
  }, [stage]);

  const door = { no: checkout.room, type: room?.type ?? '', state: stage === 'key' ? 'occupied' : checkout.state };

  return (
    <div className={`result result-ok place key-return is-${stage}`}>
      <ol className="place-steps" aria-label="Steps">
        <li className={stage === 'key' ? 'is-now' : 'is-done'}>
          <span>{stage === 'key' ? '1' : <Icon name="check" size={12} strokeWidth={3} />}</span> Take back the key card
        </li>
        <li className={stage === 'done' ? 'is-done' : stage === 'turning' ? 'is-now' : ''}>
          <span>{stage === 'done' ? <Icon name="check" size={12} strokeWidth={3} /> : '2'}</span> Room marked dirty
        </li>
      </ol>

      <div className="place-stage key-stage">
        <div className={`key-door${over ? ' is-over' : ''}${dragging ? ' is-waiting' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); takeKey(); }}>
          <RoomCell room={door} />
          {stage !== 'key' && <span className="key-in" aria-hidden="true"><Icon name="check" size={14} strokeWidth={3} /></span>}
        </div>

        {stage === 'key' && (
          <>
            <svg className="place-guide" viewBox="0 0 90 40" aria-hidden="true">
              <path d="M84 30 C 60 4, 30 4, 8 22" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />
              <path d="M14 14 L6 23 L17 27" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <button type="button" className={`key-card${dragging ? ' is-dragging' : ''}`} draggable
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', checkout.room); e.dataTransfer.effectAllowed = 'move'; setDragging(true); }}
              onDragEnd={() => { setDragging(false); setOver(false); }}
              onClick={takeKey}
              aria-label={`Key card for room ${checkout.room}. Take it back`}>
              <span className="key-card-brand">{PROPERTY.name}</span>
              <span className="key-card-chip" aria-hidden="true" />
              <span className="key-card-no mono">{checkout.room}</span>
            </button>
          </>
        )}
      </div>

      <div className="place-caption" aria-live="polite">
        {stage === 'key' && (
          <>
            <p className="place-title">Drag the key card onto room <span className="mono">{checkout.room}</span></p>
            <p className="place-text">Or tap the card. The guest has checked out.</p>
          </>
        )}
        {stage === 'turning' && <p className="place-title">Marking the room dirty…</p>}
        {stage === 'done' && (
          <>
            <p className="place-title">Room <span className="mono">{checkout.room}</span> is dirty</p>
            <p className="place-text">Grace sees it on her board now.</p>
          </>
        )}
      </div>

      {stage === 'done' && (
        <dl className="key-facts">
          <div><dt>Stay</dt><dd className="mono">{checkout.stayId}</dd></div>
          <div><dt>Left at</dt><dd className="mono">{formatTime(Date.parse(checkout.checkedOutAt))}</dd></div>
          {nextGuest && <div><dt>Next guest</dt><dd className="mono">{formatTime(Date.parse(nextGuest))}</dd></div>}
        </dl>
      )}

      {stage === 'done' && (
        <button type="button" className="btn btn-primary btn-lg btn-block place-ok" onClick={onDone} autoFocus>
          OK, next guest
        </button>
      )}
    </div>
  );
}