import { STATES } from '../data/hotel.js';

const SHORT = { Standard: 'Std', Deluxe: 'Dlx', Suite: 'Suite' };

/**
 * One room on the corridor, seen as its door: the number plate, the room type, and its state as a coloured strip
 * and a word (occupied, dirty, assigned, cleaning, to inspect, ready). While somebody is on it the door names them
 * and the minutes since the step began. The state comes from the backend's answer; it is never decided here.
 * On the board (`button`) a door can be reached with Tab and is read out with its number, type and state.
 */
export default function RoomCell({ room, button = false, style }) {
  const name = STATES.find((s) => s.id === room.state)?.name ?? room.state;
  const busy = ['assigned', 'cleaning', 'toinspect'].includes(room.state);
  const content = (
    <>
      <span className="rc-plate mono">{room.no}</span>
      <span className="rc-type">{SHORT[room.type] ?? room.type}</span>
      <span className="rc-foot">
        <span className="rc-state">{name}</span>
        {busy && room.assignedTo && <span className="rc-who">{room.assignedTo}{room.sinceMinutes != null ? ` · ${room.sinceMinutes}m` : ''}</span>}
      </span>
    </>
  );
  const className = `room-cell is-${room.state}`;
  if (!button) return <span className={className} style={style}>{content}</span>;
  return (
    <button type="button" className={className} style={style} aria-label={`Room ${room.no}, ${room.type}, ${name}`}>
      {content}
    </button>
  );
}