import { STATES } from '../data/hotel.js';

/**
 * One room on the corridor, seen as its door: the number plate, the room type, and its state as a coloured strip
 * and a word. The state comes from the backend's answer; it is never decided here.
 */
export default function RoomCell({ room, style }) {
  const name = STATES.find((s) => s.id === room.state)?.name ?? room.state;
  return (
    <span className={`room-cell is-${room.state}`} style={style}>
      <span className="rc-plate mono">{room.no}</span>
      <span className="rc-type">{room.type}</span>
      <span className="rc-foot">
        <span className="rc-state">{name}</span>
      </span>
    </span>
  );
}