import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Dropdown from '../../components/Dropdown.jsx';
import Icon from '../../components/Icon.jsx';
import SectionTabs from '../../components/SectionTabs.jsx';
import { formatTime } from '../../data/format.js';
import { PROPERTY, STATES, TYPES } from '../../data/hotel.js';
import { explain } from '../../data/messages.js';
import { useApp, useGet } from '../../state/AppContext.jsx';

/** What an action answered, in the supervisor's words. */
function Outcome({ answer, ok }) {
  if (!answer) return null;
  if (answer.status < 300) return <div className="result-pill is-ok"><Icon name="check" size={16} strokeWidth={2.4} /><span>{ok(answer.body)}</span></div>;
  const { title, text } = explain(answer);
  return <div className="result-pill is-no"><Icon name="alert" size={16} /><div><strong>{title}</strong><p>{text}</p></div></div>;
}

const stateName = (id) => STATES.find((s) => s.id === id)?.name ?? id;

/** How a passed room stood against its guest: minutes before, minutes after (late), or no arrival known. */
function readyFor(margin) {
  if (margin == null) return ' (no arrival known)';
  return margin >= 0 ? `, ${margin} min before its guest` : `, ${-margin} min after its guest was due`;
}
/** How long each room type takes, from the clean minutes each Finish answer stamped (`typeOf` gives a room's type). */
function CleanTimes({ cleans, typeOf }) {
  const mean = (xs) => (xs.length ? Math.round(xs.reduce((a, x) => a + x, 0) / xs.length) : null);
  return (
    <section className="card clean-times" aria-label="Clean time by type">
      <h2 className="clean-times-title">Clean time by type</h2>
      <p className="work-hint">From each Finish: the minutes stamped once, never recomputed.</p>
      <div className="clean-times-row">
        {TYPES.map((type) => {
          const xs = cleans.filter((c) => typeOf(c.room) === type).map((c) => c.minutes);
          return (
            <div key={type} className="stat">
              <span className="stat-label">{type}</span>
              <strong className="stat-value mono">{mean(xs) == null ? '—' : `${mean(xs)} min`}</strong>
              <span className="stat-note">{xs.length ? `mean of ${xs.length} ${xs.length === 1 ? 'clean' : 'cleans'}` : 'no clean finished yet'}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const ORDER = { dirty: 0, toinspect: 1, assigned: 2, cleaning: 3, ready: 4, occupied: 5 };

/**
 * Grace's work: assign a dirty room (POST /assignments), start and finish the clean (POST /assignments/{id}/start
 * and …/finish), and inspect what somebody else cleaned (POST /inspections). Every room can be picked, so each
 * refusal can be reached; the rooms waiting for a step come first.
 */
export default function Work() {
  const { post, told } = useApp();
  const [params] = useSearchParams();
  const board = useGet(`/properties/${PROPERTY.slug}/rooms`);
  const staff = useGet(`/properties/${PROPERTY.slug}/housekeepers`);
  const rooms = (board.status === 200 ? board.body.rooms : []).slice().sort((a, b) => (ORDER[a.state] ?? 9) - (ORDER[b.state] ?? 9) || a.no.localeCompare(b.no));
  const roomOptions = rooms.map((r) => ({ value: r.no, label: `Room ${r.no}`, note: `${r.type} · ${stateName(r.state)}` }));
  // the Inspect list puts the rooms waiting for an inspection first (the Assign list puts the dirty ones first)
  const inspectOptions = [...roomOptions.filter((o) => o.note.endsWith(stateName('toinspect'))), ...roomOptions.filter((o) => !o.note.endsWith(stateName('toinspect')))];
  const staffOptions = (staff.status === 200 ? staff.body.housekeepers : []).map((h) => ({ value: h.id, label: h.name, note: h.id }));

  const firstDirty = rooms.find((r) => r.state === 'dirty')?.no;
  const [assignRoom, setAssignRoom] = useState(params.get('room') ?? '');
  const [assignTo, setAssignTo] = useState('HK03');
  const [assigned, setAssigned] = useState(null);

  const [assignmentId, setAssignmentId] = useState('');
  const [stepAnswer, setStepAnswer] = useState(null);
  const [stepRoom, setStepRoom] = useState(null);

  const firstToInspect = rooms.find((r) => r.state === 'toinspect')?.no;
  const [inspectRoom, setInspectRoom] = useState('');
  const [inspector, setInspector] = useState('HK01');
  const [result, setResult] = useState('pass');
  const [inspected, setInspected] = useState(null);

  const roomToAssign = assignRoom || firstDirty || rooms[0]?.no || '';
  const roomToInspect = inspectRoom || firstToInspect || rooms[0]?.no || '';
  // after an assignment the Start and finish card reads its room, to show where it is now (toinspect after Finish)
  const roomAfterStep = useGet(stepRoom ? `/properties/${PROPERTY.slug}/rooms/${stepRoom}` : null);

  async function assign(e) {
    e.preventDefault();
    const answer = await post('/assignments', { room: roomToAssign, housekeeper: assignTo });
    setAssigned(answer);
    if (answer.status === 201) {
      // the Assign answer fills in the Start and finish card
      setAssignmentId(answer.body.assignmentId);
      setStepRoom(answer.body.room);
      setStepAnswer(null);
    }
  }

  async function step(kind) {
    const answer = await post(`/assignments/${assignmentId.trim()}/${kind}`);
    setStepAnswer({ kind, ...answer });
  }

  async function inspect(e) {
    e.preventDefault();
    setInspected(await post('/inspections', { room: roomToInspect, inspector, result }));
  }

  const after = roomAfterStep.status === 200 ? roomAfterStep.body : null;

  return (
    <div className="page is-fit">
      <div className="page-head">
        <div>
          <p className="eyebrow">{PROPERTY.name} · housekeeping</p>
          <h1 className="page-title">Work</h1>
        </div>
        <SectionTabs personaId="supervisor" />
      </div>

      <div className="work-grid">
        <form className="card form work-card" onSubmit={assign}>
          <h2><span className="work-step">1</span>Assign a room</h2>
          <p className="work-hint">A dirty room goes to one housekeeper. Dirty rooms are listed first.</p>
          <div className="field">
            <label className="field-label" htmlFor="assign-room">Room</label>
            <Dropdown id="assign-room" label="Room to assign" value={roomToAssign} onChange={(v) => { setAssignRoom(v); setAssigned(null); }} options={roomOptions} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="assign-to">Housekeeper</label>
            <Dropdown id="assign-to" label="Housekeeper" value={assignTo} onChange={(v) => { setAssignTo(v); setAssigned(null); }} options={staffOptions} />
          </div>
          <button type="submit" className="btn btn-primary btn-block">Assign <Icon name="arrow" size={16} /></button>
          <Outcome answer={assigned} ok={(b) => `${b.room} is ${b.assignedTo}’s: assignment ${b.assignmentId}.`} />
        </form>

        <div className="card form work-card">
          <h2><span className="work-step">2</span>Start and finish</h2>
          <p className="work-hint">Assigning a room fills in its assignment here. Start begins the clock; Finish stops it.</p>
          <div className="field">
            <label className="field-label" htmlFor="assignment-id">Assignment</label>
            <div className="input-wrap">
              <input id="assignment-id" className="input mono" value={assignmentId} placeholder="AS001" autoComplete="off"
                onChange={(e) => { setAssignmentId(e.target.value); setStepAnswer(null); }} />
            </div>
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={() => step('start')} disabled={!assignmentId.trim()}><Icon name="clock" size={16} /> Start</button>
            <button type="button" className="btn btn-soft" onClick={() => step('finish')} disabled={!assignmentId.trim()}><Icon name="sparkle" size={16} /> Finish</button>
          </div>
          <Outcome answer={stepAnswer} ok={(b) => (stepAnswer.kind === 'start'
            ? `Started at ${formatTime(Date.parse(b.startedAt))}.`
            : `Finished: ${b.cleanMinutes} min clean, stamped once.`)} />
          {after && <p className="work-hint">Room {after.no} is now <strong className={`state-word is-${after.state}`}>{stateName(after.state)}</strong>.</p>}
        </div>

        <form className="card form work-card" onSubmit={inspect}>
          <h2><span className="work-step">3</span>Inspect</h2>
          <p className="work-hint">Somebody other than the cleaner passes or fails it. Rooms to inspect are listed first.</p>
          <div className="field">
            <label className="field-label" htmlFor="inspect-room">Room</label>
            <Dropdown id="inspect-room" label="Room to inspect" value={roomToInspect} onChange={(v) => { setInspectRoom(v); setInspected(null); }} options={inspectOptions} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="inspector">Inspector</label>
            <Dropdown id="inspector" label="Inspector" value={inspector} onChange={(v) => { setInspector(v); setInspected(null); }} options={staffOptions} />
          </div>
          <div className="segmented" role="group" aria-label="Result">
            {[['pass', 'Pass'], ['fail', 'Fail']].map(([id, text]) => (
              <button key={id} type="button" aria-pressed={result === id} className={`seg${result === id ? ' is-on' : ''}`}
                onClick={() => { setResult(id); setInspected(null); }}>{text}</button>
            ))}
          </div>
          <button type="submit" className="btn btn-primary btn-block">Record the inspection <Icon name="check" size={16} /></button>
          <Outcome answer={inspected} ok={(b) => (b.result === 'pass'
            ? `${b.room} is ready${readyFor(b.marginMinutes)}.`
            : `${b.room} failed: back to dirty, for a new assignment.`)} />
        </form>
      </div>

      <CleanTimes cleans={told.cleans} typeOf={(no) => rooms.find((r) => r.no === no)?.type} />
    </div>
  );
}