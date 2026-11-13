import { NavLink } from 'react-router-dom';
import { PROPERTY } from '../data/hotel.js';
import { PERSONAS } from '../data/personas.js';
import { useGet } from '../state/AppContext.jsx';
import Icon from './Icon.jsx';

/**
 * The sections of a person with more than one screen (only the supervisor has two), shown in the page's
 * title row. The current one is filled with the person's colour; a badge counts what is waiting there.
 */
export default function SectionTabs({ personaId }) {
  const persona = PERSONAS.find((p) => p.id === personaId);
  // the Work tab counts the rooms waiting for a step there (dirty, or finished and waiting for inspection)
  const rooms = useGet(`/properties/${PROPERTY.slug}/rooms`).body?.rooms ?? [];
  const badges = { '/supervisor/work': rooms.filter((r) => r.state === 'dirty' || r.state === 'toinspect').length };
  // One section is not a choice: a person with one screen gets no tabs.
  if (persona.nav.length < 2) return null;

  return (
    <nav className="section-tabs" aria-label={`${persona.name}'s screens`} style={{ '--persona': persona.color }}>
      {persona.nav.map((item) => (
        <NavLink key={item.to} to={item.to} end
          className={({ isActive }) => `section-tab${isActive ? ' is-active' : ''}`}>
          <Icon name={item.icon} size={17} strokeWidth={2} />
          <span>{item.label}</span>
          {badges[item.to] > 0 && <span className="section-tab-badge">{badges[item.to]}</span>}
        </NavLink>
      ))}
    </nav>
  );
}