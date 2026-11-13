import { useRef, useState } from 'react';
import Icon from './Icon.jsx';
import useDismiss from './useDismiss.js';

/**
 * The app's own drop-down, in place of the browser's: a button showing the choice, and a list that
 * opens below it. A click outside or Esc closes it; the arrow keys move through it, Enter picks.
 * `options` are { value, label, note? }.
 */
export default function Dropdown({ value, options, onChange, label, id }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef(null);
  useDismiss(box, open, () => setOpen(false));

  const current = options.find((o) => o.value === value);

  function toggle() {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(!open);
  }
  function pick(option) {
    onChange(option.value);
    setOpen(false);
  }
  function onKey(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(); return; }
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(options[active]); }
  }

  return (
    <div className={`dropdown${open ? ' is-open' : ''}`} ref={box}>
      <button id={id} type="button" className="dropdown-button" onClick={toggle} onKeyDown={onKey}
        aria-haspopup="listbox" aria-expanded={open} aria-label={current ? `${label}: ${current.label}` : label}>
        <span className="dropdown-value">{current?.label ?? 'Choose…'}</span>
        <Icon name="chevron" size={14} className="dropdown-chevron" />
      </button>
      {open && (
        <ul className="dropdown-list" role="listbox" aria-label={label}>
          {options.map((o, i) => (
            <li key={o.value} role="option" aria-selected={o.value === value}
              className={`dropdown-option${o.value === value ? ' is-current' : ''}${i === active ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); pick(o); }}>
              <span className="dropdown-option-text">
                <span className="dropdown-option-label">{o.label}</span>
                {o.note && <span className="dropdown-option-note">{o.note}</span>}
              </span>
              {o.value === value && <Icon name="check" size={14} strokeWidth={2.4} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}