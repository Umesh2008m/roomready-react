import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

// What the screens share: a version number that makes them read their data again, and what the answers told them.
// Screens read with useGet() and change things with post(), both through api.js, exactly as they would talk to a
// real server.
const AppContext = createContext(null);

/**
 * What the screens were told and keep, because no GET returns it: the room of each assignment (the Assign answer)
 * and each clean's minutes (the Finish answer).
 */
function remember(told, path, body) {
  if (path === '/assignments') return { ...told, rooms: { ...told.rooms, [body.assignmentId]: body.room } };
  if (/^\/assignments\/[^/]+\/finish$/.test(path)) {
    const room = told.rooms[body.assignmentId];
    return room ? { ...told, cleans: [...told.cleans, { room, minutes: body.cleanMinutes }] } : told;
  }
  return told;
}

export function AppProvider({ children }) {
  // Bumped by every change and every 20 seconds, so the screens read their data again (a real frontend refetches).
  const [version, setVersion] = useState(0);
  const [told, setTold] = useState({ rooms: {}, cleans: [] });

  // Time passes while the page is open, so the minutes on a room grow on their own.
  useEffect(() => {
    const timer = setInterval(() => setVersion((v) => v + 1), 20_000);
    return () => clearInterval(timer);
  }, []);

  /** A request that changes the data, such as a checkout. */
  async function post(path, body) {
    const answer = await api.post(path, body);
    if (answer.status < 300) {
      setTold((t) => remember(t, path, answer.body));
      setVersion((v) => v + 1);
    }
    return answer;
  }

  /**
   * The open assignment on a room, for Sunita's Start and Finish (AS001). No call names it: POST /assignments answers
   * with it once, and the room and the housekeepers carry only names. Her screen reads it from what that answer told
   * the app, as a phone that remembered it would.
   */
  function assignmentOn(roomNo) {
    return Object.keys(told.rooms).filter((id) => told.rooms[id] === roomNo).at(-1) ?? null;
  }

  const value = { version, told, post, assignmentOn };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}

const NOTHING = { status: 0, body: null };

/**
 * A GET whose answer a screen shows: { status: 0 } until the first answer for this path arrives, and while `path` is
 * null (nothing to ask yet). A refetch keeps the last answer on screen until the new one is in.
 */
export function useGet(path) {
  const { version } = useApp();
  const [got, setGot] = useState({ path: null, answer: NOTHING });
  useEffect(() => {
    if (!path) return undefined;
    let current = true;
    api.get(path).then((answer) => { if (current) setGot({ path, answer }); });
    return () => { current = false; };
  }, [path, version]);
  return path && got.path === path ? got.answer : NOTHING;
}