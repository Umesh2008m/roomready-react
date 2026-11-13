import { explain } from '../data/messages.js';
import Icon from './Icon.jsx';

/** A refusal, shown the same way on every screen: what happened, and what to do next (nothing until an answer is in). */
export default function Problem({ answer, children, compact = false }) {
  if (answer.status === 0) return null;
  const { title, text } = explain(answer);
  return (
    <div className={`problem${compact ? ' is-compact' : ''}`} role="alert">
      <span className="problem-icon"><Icon name="alert" size={compact ? 16 : 20} /></span>
      <div className="problem-body">
        <p className="problem-title">{title}</p>
        {text && <p className="problem-text">{text}</p>}
        {children}
      </div>
    </div>
  );
}