import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

// What the screens share: a version number that makes them read their data again. Screens read with useGet(),
// through api.js, exactly as they would talk to a real server.
const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Bumped as time passes, so the screens read their data again.
  const [version, setVersion] = useState(0);

  // Time passes while the page is open, so the screens read their data again every 20 seconds.
  useEffect(() => {
    const timer = setInterval(() => setVersion((v) => v + 1), 20_000);
    return () => clearInterval(timer);
  }, []);

  const value = { version };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function useApp() {
  return useContext(AppContext);
}

const NOTHING = { status: 0, body: null };

/**
 * A GET whose answer a screen shows: { status: 0 } until the first answer arrives. A refetch keeps the last answer on
 * screen until the new one is in.
 */
export function useGet(path) {
  const { version } = useApp();
  const [answer, setAnswer] = useState(NOTHING);
  useEffect(() => {
    let current = true;
    api.get(path).then((got) => { if (current) setAnswer(got); });
    return () => { current = false; };
  }, [path, version]);
  return answer;
}