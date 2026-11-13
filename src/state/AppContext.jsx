import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

// What the screens share: a version number that makes them read their data again.
// Screens read with useGet() and change things with post(), both through api.js, exactly as they would talk to a
// real server.
const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Bumped by every change and every 20 seconds, so the screens read their data again (a real frontend refetches).
  const [version, setVersion] = useState(0);

  // Time passes while the page is open, so the minutes on a room grow on their own.
  useEffect(() => {
    const timer = setInterval(() => setVersion((v) => v + 1), 20_000);
    return () => clearInterval(timer);
  }, []);

  /** A request that changes the data, such as a checkout. */
  async function post(path, body) {
    const answer = await api.post(path, body);
    if (answer.status < 300) {
      setVersion((v) => v + 1);
    }
    return answer;
  }

  const value = { version, post };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}

const NOTHING = { status: 0, body: null };

/**
 * A GET whose answer a screen shows: { status: 0 } until the first answer for this path arrives. A refetch keeps the
 * last answer on screen until the new one is in.
 */
export function useGet(path) {
  const { version } = useApp();
  const [got, setGot] = useState({ path: null, answer: NOTHING });
  useEffect(() => {
    let current = true;
    api.get(path).then((answer) => { if (current) setGot({ path, answer }); });
    return () => { current = false; };
  }, [path, version]);
  return got.path === path ? got.answer : NOTHING;
}