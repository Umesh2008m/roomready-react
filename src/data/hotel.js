// Harbour View as the screens draw it: its name and address in the API (the slug), and the words for each room
// state. The rooms themselves come from the backend.
export const PROPERTY = { slug: 'harbour-view', name: 'Harbour View' };

/** The room states, in the order a room goes through them. */
export const STATES = [
  { id: 'occupied', name: 'Occupied' },
  { id: 'dirty', name: 'Dirty' },
];