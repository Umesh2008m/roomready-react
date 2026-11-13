import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import Problem from '../../components/Problem.jsx';
import RoomCell from '../../components/RoomCell.jsx';
import { formatTime } from '../../data/format.js';
import { PROPERTY, STATES } from '../../data/hotel.js';
import { explain } from '../../data/messages.js';
import { useApp, useGet } from '../../state/AppContext.jsx';

const ME = { code: 'HK03', name: 'Sunita' };
const stateName = (id) => STATES.find((s) => s.id === id)?.name ?? id;

/**
 * Sunita's screen: the room she holds (GET …/housekeepers), read on its own (GET …/rooms/{no}), with Start and
 * Finish. She can also try to sign off her own clean, which the backend refuses.
 */
export default function MyRooms() {
  const { post, assignmentOn } = useApp();
  const staff = useGet(`/properties/${PROPERTY.slug}/housekeepers`);
  const me = staff.status === 200 ? staff.body.housekeepers.find((h) => h.id === ME.code) : null;
  const roomNo = me?.openAssignment ?? null;
  const [last, setLast] = useState(null);         // the room of her last press, still shown once an inspection takes it off her
  const shownNo = roomNo ?? last?.room ?? null;
  const roomAnswer = useGet(shownNo ? `/properties/${PROPERTY.slug}/rooms/${shownNo}` : null);
  const room = roomAnswer.status === 200 ? roomAnswer.body : null;
  const [answer, setAnswer] = useState(null);

  async function act(kind) {
    const id = assignmentOn(shownNo);
    const result = kind === 'inspect'
      ? await post('/inspections', { room: shownNo, inspector: ME.code, result: 'pass' })
      : await post(`/assignments/${id}/${kind}`);
    setAnswer({ kind, ...result });
    setLast({ room: shownNo });
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{ME.name} · {ME.code}</p>
          <h1 className="page-title">My rooms</h1>
        </div>
      </div>

      {staff.status !== 200 ? <Problem answer={staff} /> : !shownNo ? (
        <div className="empty">
          <Icon name="sparkle" size={28} />
          <p className="empty-title">No room for you yet</p>
          <p className="empty-text">When Grace assigns you a dirty room, it appears here with Start and Finish.</p>
        </div>
      ) : (
        <div className="card my-room">
          {room ? <RoomCell room={room} /> : <span />}
          <div className="work-card">
            <h2>Room {shownNo}{room && <> · <span className={`state-word is-${room.state}`}>{stateName(room.state)}</span></>}</h2>
            <p className="work-hint">
              {room?.state === 'assigned' && 'Yours to clean. Press Start when you open the door.'}
              {room?.state === 'cleaning' && 'The clock is running. Press Finish when the room is done.'}
              {room?.state === 'toinspect' && 'Done and timed. Somebody else will inspect it.'}
              {room && !['assigned', 'cleaning', 'toinspect'].includes(room.state) && 'This room is no longer yours.'}
            </p>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={() => act('start')} disabled={!roomNo}><Icon name="clock" size={16} /> Start</button>
              <button type="button" className="btn btn-soft" onClick={() => act('finish')} disabled={!roomNo}><Icon name="sparkle" size={16} /> Finish</button>
              <button type="button" className="btn btn-soft" onClick={() => act('inspect')} disabled={!roomNo}><Icon name="check" size={16} /> Tick it myself</button>
            </div>
            {answer && (answer.status < 300
              ? <div className="result-pill is-ok"><Icon name="check" size={16} strokeWidth={2.4} />
                <span>{answer.kind === 'start' ? `Started at ${formatTime(Date.parse(answer.body.startedAt))}.` : answer.kind === 'finish' ? `Finished: ${answer.body.cleanMinutes} min.` : 'Inspected.'}</span></div>
              : <div className="result-pill is-no"><Icon name="alert" size={16} /><div><strong>{explain(answer).title}</strong><p>{explain(answer).text}</p></div></div>)}
          </div>
        </div>
      )}
    </div>
  );
}