import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { assign, checkOut, cleaned, clockAt, jump, madeReady, MINUTE, person, roomsFrom, start, wait, WED_0900 } from './given.js';
import { reading } from './look.js';

// The rooms of floor 1, 101 to 115, as the ticket gives them: FLOOR_1[1] is 102.
const FLOOR_1 = roomsFrom('101', '115');
const [, R102, R103, R104, R105, R106] = FLOOR_1;

const door = (name) => screen.getByRole('button', { name });
const floor = (n) => screen.getByRole('region', { name: `Floor ${n}` });

afterEach(() => vi.useRealTimers());

describe('F-03 · The board', () => {
  test('on a fresh hotel the six cards read Rooms 60, Ready 0, Dirty 0, Being cleaned 0, To inspect 0 and On time —, each with its note', async () => {
    await openApp('/supervisor/board');
    expect(screen.getByText('Harbour View · this morning')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The board' })).toBeInTheDocument();
    expect(await screen.findByText(reading('Rooms', '60', '40 Standard · 12 Deluxe · 8 Suite'))).toBeInTheDocument();
    expect(screen.getByText(reading('Ready', '0', 'for the next guest'))).toBeInTheDocument();
    expect(screen.getByText(reading('Dirty', '0', 'waiting for a housekeeper'))).toBeInTheDocument();
    expect(screen.getByText(reading('Being cleaned', '0', 'assigned or cleaning'))).toBeInTheDocument();
    expect(screen.getByText(reading('To inspect', '0', 'somebody else signs off'))).toBeInTheDocument();
    expect(screen.getByText(reading('On time', '—', 'once a room is ready for a known guest'))).toBeInTheDocument();
  });

  test('Being cleaned counts the assigned rooms and the ones being cleaned together', async () => {
    await openApp('/supervisor/board', {
      before: async (api) => {
        await checkOut(api, '101');
        await checkOut(api, R102);
        await checkOut(api, R103);
        await assign(api, '101', 'HK03');
        await start(api, await assign(api, R102, 'HK04'));
      },
    });
    expect(await screen.findByText(reading('Being cleaned', '2', 'assigned or cleaning'))).toBeInTheDocument();
    expect(screen.getByText(reading('Dirty', '1', 'waiting for a housekeeper'))).toBeInTheDocument();
  });

  test('four corridors, Floor 1 to Floor 4, each hold their fifteen doors in number order', async () => {
    await openApp('/supervisor/board');
    await screen.findByRole('region', { name: 'Floor 1' });
    for (const n of [1, 2, 3, 4]) {
      const doors = within(floor(n)).getAllByRole('button', { name: /^Room / });
      expect(within(floor(n)).getByText(`Floor ${n}`)).toBeInTheDocument();
      expect(doors.map((d) => within(d).getByText(/^\d\d\d$/).textContent)).toEqual(roomsFrom(`${n}01`, `${n}15`));
    }
  });

  test("a corridor's head says how many of its rooms are ready and dirty, e.g. '0 ready · 2 dirty'", async () => {
    await openApp('/supervisor/board', {
      before: async (api) => {
        await checkOut(api, '101');
        await checkOut(api, R102);
        await madeReady(api, '214', 'HK03', 'HK01');
      },
    });
    await screen.findByRole('region', { name: 'Floor 1' });
    expect(await within(floor(1)).findByText(reading('0 ready · 2 dirty'))).toBeInTheDocument();
    expect(within(floor(2)).getByText(reading('1 ready · 0 dirty'))).toBeInTheDocument();
    expect(within(floor(3)).getByText(reading('0 ready · 0 dirty'))).toBeInTheDocument();
  });

  test('every door shows its number, its type as Std, Dlx or Suite, and its state word', async () => {
    await openApp('/supervisor/board', {
      before: async (api) => {
        await checkOut(api, R102);
        await checkOut(api, R103);
        await assign(api, R103, 'HK03');
        await checkOut(api, R104);
        await start(api, await assign(api, R104, 'HK04'));
        await cleaned(api, R105, 'HK05');
        await madeReady(api, R106, 'HK06', 'HK01');
      },
    });
    await screen.findByRole('region', { name: 'Floor 1' });
    const doors = [
      [FLOOR_1[0], 'Std', 'Occupied'], [R102, 'Std', 'Dirty'], [R103, 'Std', 'Assigned'], [R104, 'Std', 'Cleaning'],
      [R105, 'Std', 'To inspect'], [R106, 'Std', 'Ready'], [FLOOR_1[10], 'Suite', 'Occupied'], [FLOOR_1[12], 'Dlx', 'Occupied'],
    ];
    for (const [no, type, state] of doors) {
      const one = within(floor(1)).getAllByRole('button').find((d) => within(d).queryByText(no));
      expect(within(one).getByText(no)).toBeInTheDocument();
      expect(within(one).getByText(type)).toBeInTheDocument();
      expect(within(one).getByText(state)).toBeInTheDocument();
    }
  });

  test("a room somebody is on names the housekeeper and the minutes since that step began, e.g. 'Sunita · 12m'", async () => {
    clockAt(WED_0900);
    await openApp('/supervisor/board', {
      before: async (api) => {
        await checkOut(api, '214');
        await start(api, await assign(api, '214', 'HK03'));
        jump(12 * MINUTE);
      },
    });
    const one = await screen.findByRole('button', { name: 'Room 214, Deluxe, Cleaning' });
    expect(within(one).getByText(reading('Sunita · 12m'))).toBeInTheDocument();
  });

  test('left alone, the minutes on a door grow by themselves', async () => {
    clockAt(WED_0900);
    await openApp('/supervisor/board', {
      before: async (api) => {
        await checkOut(api, '214');
        await start(api, await assign(api, '214', 'HK03'));
        jump(12 * MINUTE);
      },
    });
    const one = await screen.findByRole('button', { name: 'Room 214, Deluxe, Cleaning' });
    expect(within(one).getByText(reading('Sunita · 12m'))).toBeInTheDocument();
    await wait(2 * MINUTE);
    expect(await within(door('Room 214, Deluxe, Cleaning')).findByText(reading(`Sunita · ${12 + 2}m`))).toBeInTheDocument();
  });

  test('a change made while Grace was on another screen is already on the board when she comes back', async () => {
    const { api } = await openApp('/supervisor/work');
    const user = person();
    await checkOut(api, '101');
    await checkOut(api, R102);
    await assign(api, R102, 'HK03');
    await user.click(screen.getByRole('link', { name: /^The board/ }));
    expect(await screen.findByRole('button', { name: 'Room 101, Standard, Dirty' })).toBeInTheDocument();
    expect(door('Room 102, Standard, Assigned')).toBeInTheDocument();
    expect(screen.getByText(reading('Dirty', '1', 'waiting for a housekeeper'))).toBeInTheDocument();
    expect(screen.getByText(reading('Being cleaned', '1', 'assigned or cleaning'))).toBeInTheDocument();
  });

  test('under the corridors a legend names the six states: Occupied, Dirty, Assigned, Cleaning, To inspect, Ready', async () => {
    await openApp('/supervisor/board');
    const legend = screen.getByRole('list', { name: /legend/i });
    const items = within(legend).getAllByRole('listitem').map((li) => li.textContent.trim());
    expect(items).toEqual(['Occupied', 'Dirty', 'Assigned', 'Cleaning', 'To inspect', 'Ready']);
  });

  test('before the rooms are read no cards and no doors are drawn, then both appear', async () => {
    await openApp('/supervisor/board');
    expect(screen.queryByText('waiting for a housekeeper')).not.toBeInTheDocument();
    expect(screen.queryByText('40 Standard · 12 Deluxe · 8 Suite')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /^Room / })).toHaveLength(0);
    expect(await screen.findByText('40 Standard · 12 Deluxe · 8 Suite')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Room / })).toHaveLength(60);
  });

  test("Tab moves door by door in room order, each read out like 'Room 214, Deluxe, Occupied'", async () => {
    await openApp('/supervisor/board');
    const user = person();
    const first = await screen.findByRole('button', { name: 'Room 101, Standard, Occupied' });
    for (let i = 0; i < 40 && document.activeElement !== first; i += 1) await user.tab();
    expect(first).toHaveFocus();
    const types = (n) => (n <= 10 ? 'Standard' : n <= 12 ? 'Suite' : 'Deluxe');
    for (const f of [1, 2, 3, 4]) {
      for (let n = 1; n <= 15; n += 1) {
        if (f === 1 && n === 1) continue;
        await user.tab();
        expect(document.activeElement).toHaveAccessibleName(`Room ${f}${String(n).padStart(2, '0')}, ${types(n)}, Occupied`);
      }
    }
    expect(door('Room 214, Deluxe, Occupied')).toBeInTheDocument();
  });
});
