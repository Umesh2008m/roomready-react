import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import RoomCell from '../components/RoomCell.jsx';
import { PROPERTY } from '../data/hotel.js';
import { PERSONAS } from '../data/personas.js';
import { useGet } from '../state/AppContext.jsx';

function Avatar({ persona, size = 34 }) {
  return (
    <span className="avatar" style={{ '--avatar': persona.color, width: size, height: size, fontSize: size * 0.42 }}>
      {persona.name[0].toUpperCase()}
    </span>
  );
}

/** The first screen: what RoomReady is, a slice of a real corridor, and who you want to be. */
export default function Welcome() {
  const answer = useGet(`/properties/${PROPERTY.slug}/rooms`);
  const rooms = answer.status === 200 ? answer.body.rooms : [];
  const ready = answer.status === 200 ? answer.body.ready : 0;
  const dirty = answer.status === 200 ? answer.body.dirty : 0;
  const preview = rooms.filter((r) => r.floor === 2).slice(8, 15);

  return (
    <div className="welcome">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{PROPERTY.name} · housekeeping</p>
          <h1 className="hero-title">
            Sixty rooms.<br />
            <span>No clipboard upstairs.</span>
          </h1>
          <p className="hero-lede">
            Every room moves from occupied to dirty, cleaned, inspected and ready, raced against the day's arrivals.
            The board knows where each one is, who is on it, and how long before its guest it was ready.
          </p>
          <div className="hero-facts">
            <div><strong>{rooms.length}</strong><span>rooms</span></div>
            <div><strong className="is-free">{ready}</strong><span>ready</span></div>
            <div><strong>{dirty}</strong><span>dirty</span></div>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-corridor">
            {preview.map((r, i) => <RoomCell key={r.no} room={r} style={{ '--i': i }} />)}
          </div>
        </div>
      </section>

      <section className="pick" aria-labelledby="pick-title">
        <div className="pick-head">
          <h2 id="pick-title" className="section-title">Who are you today?</h2>
          <p className="section-sub">Each person sees their own screens. Everything they do changes the same hotel.</p>
        </div>
        <div className="pick-grid pick-grid-4">
          {PERSONAS.map((p, i) => (
            <Link key={p.id} to={p.nav[0].to} className="pick-card" style={{ '--persona': p.color, '--i': i }}>
              <Avatar persona={p} size={44} />
              <span className="pick-name">{p.name}</span>
              <span className="pick-role">{p.role}</span>
              <span className="pick-blurb">{p.blurb}</span>
              <span className="pick-go">Continue as {p.name} <Icon name="arrow" size={16} /></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}