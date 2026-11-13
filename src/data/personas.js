// The people in RoomReady's stories. Each one sees their own screens. Names come from the stories (Grace, Pradeep,
// Sunita, Mr Menon).
export const PERSONAS = [
  {
    id: 'supervisor', name: 'Grace', role: 'Supervisor · HK01', color: '#0f766e',
    blurb: 'Runs housekeeping. Sees every room, assigns the dirty ones and inspects what others cleaned.',
    nav: [
      { to: '/supervisor/board', label: 'The board', icon: 'grid' },
      { to: '/supervisor/work', label: 'Work', icon: 'list' },
    ],
  },
  {
    id: 'desk', name: 'Pradeep', role: 'Front desk', color: '#b45309',
    blurb: 'Checks guests out at the desk. The room turns dirty the moment he does.',
    nav: [{ to: '/desk/checkout', label: 'Check out', icon: 'door' }],
  },
  {
    id: 'housekeeper', name: 'Sunita', role: 'Housekeeper · HK03', color: '#4c51bf',
    blurb: 'Cleans the rooms she is given. Starts the clock when she begins and stops it when she is done.',
    nav: [{ to: '/housekeeper', label: 'My rooms', icon: 'sparkle' }],
  },
  {
    id: 'manager', name: 'Mr Menon', role: 'General manager', color: '#be123c',
    blurb: 'Judges the morning on one number: how long before the guest each room was ready.',
    nav: [{ to: '/manager/rooms', label: 'Rooms', icon: 'book' }],
  },
];

/** The persona whose screens the path belongs to, e.g. '/supervisor/board' → Grace. */
export function personaForPath(pathname) {
  const first = pathname.split('/')[1];
  const byRoute = { supervisor: 'supervisor', desk: 'desk', housekeeper: 'housekeeper', manager: 'manager' };
  return PERSONAS.find((p) => p.id === byRoute[first]) ?? null;
}