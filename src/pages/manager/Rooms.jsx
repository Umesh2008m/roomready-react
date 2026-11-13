import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import Problem from '../../components/Problem.jsx';
import RoomNotebook, { marginText } from '../../components/RoomNotebook.jsx';
import SectionTabs from '../../components/SectionTabs.jsx';
import { formatTime } from '../../data/format.js';
import { PROPERTY, STATES } from '../../data/hotel.js';
import { useGet } from '../../state/AppContext.jsx';

/**
 * One room's card for Mr Menon: the room (GET …/rooms/{no}) and, from its day (GET …/rooms/{no}/history),
 * when it was ready, the guest it was ready for, and the margin between them, stamped once.
 */
function RoomCard({ no, onOpenDay }) {
  const room = useGet(`/properties/${PROPERTY.slug}/rooms/${no}`);
  const day = useGet(`/properties/${PROPERTY.slug}/rooms/${no}/history`);
  if (room.status !== 200) return <Problem answer={room} />;
  const events = day.status === 200 ? day.body.events : [];
  const readyLine = [...events].reverse().find((e) => e.kind === 'inspected' && e.result === 'pass');
  const margin = readyLine ? readyLine.marginMinutes : null;
  const arrival = readyLine ? readyLine.arrivalAt : null;
  return (
    <div className="card work-card">
      <h2>Room {no} · <span className={`state-word is-${room.body.state}`}>{STATES.find((s) => s.id === room.body.state)?.name}</span></h2>
      {readyLine ? (
        <div className="margin-card">
          <div className="stat"><span className="stat-label">Ready</span><strong className="stat-value mono">{formatTime(Date.parse(readyLine.at))}</strong><span className="stat-note">passed inspection</span></div>
          <div className="stat"><span className="stat-label">Guest due</span><strong className="stat-value mono">{arrival ? formatTime(Date.parse(arrival)) : '—'}</strong><span className="stat-note">{arrival ? 'typed in at checkout' : 'no arrival known'}</span></div>
          <div className="stat"><span className="stat-label">Margin</span><strong className={`stat-value mono${margin != null && margin < 0 ? ' is-late' : ' is-free'}`}>{margin != null ? `${margin} min` : '—'}</strong><span className="stat-note">{marginText(margin)}</span></div>
        </div>
      ) : (
        <p className="work-hint">Not ready yet in this stay. Its card fills in once it passes inspection.</p>
      )}
      <button type="button" className="link-btn" onClick={() => onOpenDay(no)}>Open room {no}’s day <Icon name="arrow" size={14} /></button>
    </div>
  );
}

/** Mr Menon's rooms: every room that has moved this stay (GET …/rooms), each opening its card and its day. */
export default function Rooms() {
  const board = useGet(`/properties/${PROPERTY.slug}/rooms`);
  const [selected, setSelected] = useState(null);
  const [openDay, setOpenDay] = useState(null);
  const moved = (board.status === 200 ? board.body.rooms : []).filter((r) => r.state !== 'occupied');
  const shown = selected ?? moved.find((r) => r.state === 'ready')?.no ?? moved[0]?.no ?? null;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{PROPERTY.name} · ready before arrival</p>
          <h1 className="page-title">Rooms</h1>
        </div>
        <SectionTabs personaId="manager" />
      </div>

      {board.status === 0 ? null : moved.length === 0 ? (
        <div className="empty">
          <Icon name="book" size={28} />
          <p className="empty-title">Every guest is still in</p>
          <p className="empty-text">When Pradeep checks a room out, it appears here with its whole day.</p>
        </div>
      ) : (
        <div className="split">
          <div className="table-card">
            <table className="table">
              <thead><tr><th>Room</th><th>Type</th><th>Now</th><th aria-label="Open" /></tr></thead>
              <tbody>
                {moved.map((r, i) => (
                  <tr key={r.no} className={`is-openable${r.no === shown ? ' is-current' : ''}`} style={{ '--i': i }} onClick={() => setSelected(r.no)}>
                    <td className="mono strong">{r.no}</td>
                    <td>{r.type}</td>
                    <td><span className={`state-word is-${r.state}`}>{STATES.find((s) => s.id === r.state)?.name}</span></td>
                    <td>
                      <button type="button" className="row-link" aria-label={`Open room ${r.no}’s card`} onClick={(e) => { e.stopPropagation(); setSelected(r.no); }}>
                        <Icon name="arrow" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {shown && <RoomCard key={shown} no={shown} onOpenDay={setOpenDay} />}
        </div>
      )}

      {openDay && <RoomNotebook key={openDay} no={openDay} onClose={() => setOpenDay(null)} />}
    </div>
  );
}