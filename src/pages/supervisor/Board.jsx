import RoomCell from '../../components/RoomCell.jsx';
import SectionTabs from '../../components/SectionTabs.jsx';
import { FLOORS, PROPERTY, STATES } from '../../data/hotel.js';
import { useGet } from '../../state/AppContext.jsx';

/**
 * Grace's board: GET /properties/harbour-view/rooms, read once for the count cards and the corridors both.
 */
export default function Board() {
  const everything = useGet(`/properties/${PROPERTY.slug}/rooms`);
  const all = everything.status === 200 ? everything.body.rooms : [];
  const count = (s) => all.filter((r) => r.state === s).length;

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

      <div>
        {everything.status === 200 && (
          <div className="hotel">
            {FLOORS.map((f) => {
              const rooms = all.filter((r) => r.floor === f);
              return (
                <section key={f} className="corridor" aria-label={`Floor ${f}`}>
                  <header className="corridor-head">
                    <span>Floor {f}</span>
                    <span className="mono">{rooms.filter((r) => r.state === 'ready').length} ready · {rooms.filter((r) => r.state === 'dirty').length} dirty</span>
                  </header>
                  <div className="corridor-row">
                    {rooms.map((r, i) => (
                      <RoomCell key={r.no} room={r} button style={{ '--i': i }} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <ul className="legend legend-below legend-wrap" aria-label="Legend">
        {STATES.filter((s) => s.id !== 'out_of_order').map((s) => <li key={s.id}><span className={`dot is-${s.id}`} /> {s.name}</li>)}
      </ul>
    </div>
  );
}