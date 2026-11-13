import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { assign, checkOut, clockAt, jump, MINUTE, person, roomsFrom, start, WED_0900 } from './given.js';
import { reading } from './look.js';

// Rooms the ticket names: 214 (a Deluxe on floor 2) and the suites of floor 2, 211 and 212 (Suite rooms sit at 11 and 12).
const [, , R211, R212, R213] = roomsFrom('209', '215');
const [R101, R102, , , , , , , , , R111] = roomsFrom('101', '115');

const doors = () => screen.queryAllByRole('button', { name: /^Room \d/ });
const doorNumbers = () => doors().map((d) => within(d).getByText(/^\d\d\d$/).textContent);
const pressed = (name) => screen.getByRole('button', { name, pressed: true });
const stateButton = () => screen.getByRole('button', { name: /^State/ });
const query = (address) => Object.fromEntries(new URLSearchParams(address.split('?')[1] ?? ''));
const drawer = () => screen.getByRole('dialog');

async function board(path = '/supervisor/board', before) {
  const app = await openApp(path, { before });
  await screen.findAllByRole('button', { name: /^Room \d/ });
  return { ...app, user: person() };
}

async function dirtyMorning(api) {
  for (const no of [R101, R102, R111, R211, R212, R213]) await checkOut(api, no);
}

afterEach(() => vi.useRealTimers());

describe('F-04 · Finding one room', () => {
  test("clicking 'Floor 2' shows only the floor 2 corridor, presses it, and puts ?floor=2 in the address", async () => {
    const { user, address } = await board();
    await user.click(screen.getByRole('button', { name: 'Floor 2' }));
    expect(await screen.findByRole('button', { name: 'Floor 2', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All floors', pressed: false })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Floor 2' })).toBeInTheDocument();
    for (const n of [1, 3, 4]) expect(screen.queryByRole('region', { name: `Floor ${n}` })).not.toBeInTheDocument();
    expect(doorNumbers()).toHaveLength(15);
    expect(doorNumbers().every((no) => no.startsWith('2'))).toBe(true);
    expect(address().startsWith('/supervisor/board?')).toBe(true);
    expect(query(address())).toEqual({ floor: '2' });
  });

  test("on floor 2, 'Suite' and 'Dirty' leave only floor 2's dirty suites, with floor, type and state in the address", async () => {
    const { user, address } = await board('/supervisor/board', dirtyMorning);
    await user.click(screen.getByRole('button', { name: 'Floor 2' }));
    await user.click(screen.getByRole('button', { name: 'Suite' }));
    await user.click(stateButton());
    await user.click(screen.getByRole('option', { name: 'Dirty' }));
    await screen.findByRole('button', { name: `Room ${R211}, Suite, Dirty` });
    expect(doorNumbers()).toEqual([R211, R212]);
    expect(pressed('Floor 2')).toBeInTheDocument();
    expect(pressed('Suite')).toBeInTheDocument();
    expect(query(address())).toEqual({ floor: '2', type: 'Suite', state: 'dirty' });
  });

  test("with a filter on, a line beside the filters reads e.g. '15 shown · 0 ready · 2 dirty'", async () => {
    const { user } = await board('/supervisor/board', dirtyMorning);
    await user.click(screen.getByRole('button', { name: 'Floor 1' }));
    expect(await screen.findByText(reading('15 shown · 0 ready · 3 dirty'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Suite' }));
    expect(await screen.findByText(reading('2 shown · 0 ready · 1 dirty'))).toBeInTheDocument();
  });

  test('with no filter on, the shown line is not there', async () => {
    const { user } = await board('/supervisor/board?floor=2', dirtyMorning);
    expect(await screen.findByText(/shown/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'All floors' }));
    await screen.findByRole('button', { name: 'All floors', pressed: true });
    expect(screen.queryByText(/shown/)).not.toBeInTheDocument();
  });

  test("'All floors', 'Any type' and 'Any state' each take their filter out of the address and widen the board again", async () => {
    const { user, address } = await board('/supervisor/board?floor=2&type=Suite&state=dirty', dirtyMorning);
    expect(doorNumbers()).toEqual([R211, R212]);
    await user.click(screen.getByRole('button', { name: 'All floors' }));
    await screen.findByRole('button', { name: `Room ${R111}, Suite, Dirty` });
    expect(query(address())).toEqual({ type: 'Suite', state: 'dirty' });
    expect(doorNumbers()).toEqual([R111, R211, R212]);
    await user.click(screen.getByRole('button', { name: 'Any type' }));
    await screen.findByRole('button', { name: `Room ${R101}, Standard, Dirty` });
    expect(query(address())).toEqual({ state: 'dirty' });
    expect(doorNumbers()).toEqual([R101, R102, R111, R211, R212, R213]);
    await user.click(stateButton());
    await user.click(screen.getByRole('option', { name: 'Any state' }));
    expect(await screen.findAllByRole('button', { name: /^Room \d/ })).toHaveLength(60);
    expect(address()).toBe('/supervisor/board');
  });

  test('with a filter on, the count cards still count the whole hotel', async () => {
    await board('/supervisor/board?floor=2', dirtyMorning);
    expect(doors()).toHaveLength(15);
    expect(screen.getByText(reading('Rooms', '60'))).toBeInTheDocument();
    expect(screen.getByText(reading('Dirty', '6'))).toBeInTheDocument();
  });

  test('opening /supervisor/board?floor=3&state=dirty shows the board already narrowed, Floor 3 pressed and Dirty chosen', async () => {
    await openApp('/supervisor/board?floor=3&state=dirty', { before: (api) => checkOut(api, '315') });
    expect(await screen.findByRole('button', { name: 'Room 315, Deluxe, Dirty' })).toBeInTheDocument();
    expect(doors()).toHaveLength(1);
    expect(pressed('Floor 3')).toBeInTheDocument();
    expect(within(stateButton()).getByText('Dirty')).toBeInTheDocument();
  });

  test("filters that match no room show 'No room matches these filters' in place of the corridors", async () => {
    await openApp('/supervisor/board?floor=1&type=Suite&state=ready');
    expect(await screen.findByText('No room matches these filters')).toBeInTheDocument();
    expect(screen.getByText('Change the floor, the type or the state to see more of the hotel.')).toBeInTheDocument();
    expect(doors()).toHaveLength(0);
    expect(screen.queryByRole('region', { name: /^Floor/ })).not.toBeInTheDocument();
  });

  test("/supervisor/board?floor=9 says 'Something in the filters is not right', and 'Show the whole hotel' clears the filters", async () => {
    const { address } = await openApp('/supervisor/board?floor=9');
    expect(await screen.findByText('Something in the filters is not right')).toBeInTheDocument();
    expect(screen.getByText('Pick a floor: 1, 2, 3 or 4.')).toBeInTheDocument();
    expect(doors()).toHaveLength(0);
    await person().click(screen.getByText('Show the whole hotel'));
    expect(address()).toBe('/supervisor/board');
    expect(await screen.findAllByRole('button', { name: /^Room \d/ })).toHaveLength(60);
    expect(screen.queryByText('Something in the filters is not right')).not.toBeInTheDocument();
  });

  test("the State drop-down opens a list of 'Any state' and the six states, with the current choice ticked", async () => {
    const { user } = await board('/supervisor/board?state=cleaning', async (api) => {
      await checkOut(api, '214');
      await start(api, await assign(api, '214', 'HK03'));
    });
    await user.click(stateButton());
    const list = screen.getByRole('listbox');
    const options = within(list).getAllByRole('option');
    expect(options.map((o) => o.textContent.trim())).toEqual(['Any state', 'Occupied', 'Dirty', 'Assigned', 'Cleaning', 'To inspect', 'Ready']);
    expect(within(list).getByRole('option', { name: 'Cleaning', selected: true })).toBeInTheDocument();
    expect(within(list).getAllByRole('option', { selected: true })).toHaveLength(1);
  });

  test('a click outside the State list, or Esc, closes it without changing the choice', async () => {
    const { user, address } = await board();
    await user.click(stateButton());
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.click(screen.getByRole('heading', { name: 'The board' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.click(stateButton());
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(within(stateButton()).getByText('Any state')).toBeInTheDocument();
    expect(address()).toBe('/supervisor/board');
  });

  test("the Housekeepers strip has nine chips with code, name and 'free' or the room she holds, e.g. 'HK03 Sunita 214'", async () => {
    await openApp('/supervisor/board', {
      before: async (api) => {
        await checkOut(api, '214');
        await assign(api, '214', 'HK03');
      },
    });
    expect(screen.getByText('Housekeepers')).toBeInTheDocument();
    expect(await screen.findByText(reading('HK03', 'Sunita', '214'))).toBeInTheDocument();
    expect(screen.getAllByText(/^HK\d\d$/)).toHaveLength(9);
    expect(screen.getAllByText('free')).toHaveLength(8);
  });

  test("clicking door 214 opens its drawer with 'Floor 2 · Deluxe', the number 214, its door and its State", async () => {
    const { user } = await board();
    await user.click(screen.getByRole('button', { name: 'Room 214, Deluxe, Occupied' }));
    const one = drawer();
    expect(await within(one).findByText('Floor 2 · Deluxe')).toBeInTheDocument();
    expect(within(one).getAllByText('214').length).toBeGreaterThanOrEqual(1);
    expect(within(one).getByText('Dlx')).toBeInTheDocument();
    expect(within(one).getByText(reading('State', 'Occupied'))).toBeInTheDocument();
  });

  test("with somebody on 214 its drawer also shows 'On it' with her name and 'For' with the minutes, e.g. '12 min'", async () => {
    clockAt(WED_0900);
    const { user } = await board('/supervisor/board', async (api) => {
      await checkOut(api, '214');
      await start(api, await assign(api, '214', 'HK03'));
      jump(12 * MINUTE);
    });
    await user.click(screen.getByRole('button', { name: 'Room 214, Deluxe, Cleaning' }));
    expect(await within(drawer()).findByText(reading('On it', 'Sunita'))).toBeInTheDocument();
    expect(within(drawer()).getByText(reading('For', '12 min'))).toBeInTheDocument();
  });

  test("✕ ('Close') shuts the drawer and the board is as she left it, filters included", async () => {
    const { user, address } = await board('/supervisor/board?floor=2');
    await user.click(screen.getByRole('button', { name: 'Room 214, Deluxe, Occupied' }));
    await user.click(within(drawer()).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(query(address())).toEqual({ floor: '2' });
    expect(pressed('Floor 2')).toBeInTheDocument();
    expect(doors()).toHaveLength(15);
  });

  test('Esc shuts the drawer and the board is as she left it, filters included', async () => {
    const { user, address } = await board('/supervisor/board?floor=2');
    await user.click(screen.getByRole('button', { name: 'Room 214, Deluxe, Occupied' }));
    await within(drawer()).findByText('Floor 2 · Deluxe');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(query(address())).toEqual({ floor: '2' });
    expect(doors()).toHaveLength(15);
  });

  test('by keyboard: Enter presses a floor and Space presses a type', async () => {
    const { user, address } = await board();
    const floor2 = screen.getByRole('button', { name: 'Floor 2' });
    for (let i = 0; i < 20 && document.activeElement !== floor2; i += 1) await user.tab();
    expect(floor2).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('button', { name: 'Floor 2', pressed: true })).toBeInTheDocument();
    const suite = screen.getByRole('button', { name: 'Suite' });
    for (let i = 0; i < 20 && document.activeElement !== suite; i += 1) await user.tab();
    expect(suite).toHaveFocus();
    await user.keyboard(' ');
    expect(await screen.findByRole('button', { name: 'Suite', pressed: true })).toBeInTheDocument();
    expect(query(address())).toEqual({ floor: '2', type: 'Suite' });
  });

  test('by keyboard: ↓ opens the State drop-down, ↓ and ↑ move, Enter picks', async () => {
    const { user, address } = await board();
    const button = stateButton();
    for (let i = 0; i < 20 && document.activeElement !== button; i += 1) await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowUp}');
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(within(stateButton()).getByText('Dirty')).toBeInTheDocument();
    expect(query(address())).toEqual({ state: 'dirty' });
  });

  test('by keyboard: Enter and Space open the State drop-down and Esc closes it', async () => {
    const { user, address } = await board();
    const button = stateButton();
    for (let i = 0; i < 20 && document.activeElement !== button; i += 1) await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.keyboard(' ');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(address()).toBe('/supervisor/board');
  });

  test('by keyboard: Enter on a door opens its drawer with the focus on ✕, and Esc closes it and puts the focus back on the door', async () => {
    const { user } = await board('/supervisor/board?floor=2');
    const door = screen.getByRole('button', { name: 'Room 214, Deluxe, Occupied' });
    for (let i = 0; i < 40 && document.activeElement !== door; i += 1) await user.tab();
    expect(door).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(within(drawer()).getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Room 214, Deluxe, Occupied' })).toHaveFocus();
  });
});
