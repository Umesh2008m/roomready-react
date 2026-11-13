// Harbour View as the screens draw it: its name and address in the API (the slug), its floors, and the words for
// each room state. The rooms themselves come from the backend.
export const PROPERTY = { slug: 'harbour-view', name: 'Harbour View' };

export const FLOORS = [1, 2, 3, 4];

/** The room states, in the order a room goes through them. */
export const STATES = [
  { id: 'occupied', name: 'Occupied' },
  { id: 'dirty', name: 'Dirty' },
  { id: 'assigned', name: 'Assigned' },
  { id: 'cleaning', name: 'Cleaning' },
  { id: 'toinspect', name: 'To inspect' },
  { id: 'ready', name: 'Ready' },
  { id: 'out_of_order', name: 'Out of order' },
];