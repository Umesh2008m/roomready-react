// Opens the whole app at one address, on a fresh hotel, the way a person would land on it.
// Every call starts from the starting data again: the app's modules are loaded anew, so nothing a previous test did
// is still in the hotel. `before(api)` can put the hotel into a state first (checkouts, assignments, inspections),
// through the same api the screens use. `address()` reads the address bar: the path and the ?query the app is on now.
import { render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { vi } from 'vitest';

function AddressBar({ onChange }) {
  const location = useLocation();
  onChange(location.pathname + location.search);
  return null;
}

export async function openApp(path = '/', { before } = {}) {
  vi.resetModules();
  const { api } = await import('../src/api.js');
  if (before) await before(api);
  const { default: App } = await import('../src/App.jsx');
  const { AppProvider } = await import('../src/state/AppContext.jsx');
  let current = path;
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <AddressBar onChange={(where) => { current = where; }} />
      <AppProvider>
        <App />
      </AppProvider>
    </MemoryRouter>,
  );
  return { ...view, api, address: () => current };
}
