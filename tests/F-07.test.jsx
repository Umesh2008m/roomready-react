import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { assign, checkOut, cleaned, madeReady, person, roomsFrom, start } from './given.js';
import { reading } from './look.js';

// Rooms the tickets name: 214, and the first and last rooms of the hotel's range, 101–115 up to 401–415.
const roomDropDown = () => screen.getAllByLabelText('Room')[0];
const housekeeperDropDown = () => screen.getAllByLabelText('Housekeeper')[0];
const assignButton = () => screen.getByRole('button', { name: 'Assign' });

async function work(before, path = '/supervisor/work') {
  const app = await openApp(path, { before });
  await within(roomDropDown()).findByText(/^Room \d/);
  return { ...app, user: person() };
}

async function pick(user, dropDown, label) {
  await user.click(dropDown);
  await user.click(within(screen.getByRole('listbox')).getByText(label));
}

afterEach(() => vi.useRealTimers());

describe('F-07 · Assigning the work', () => {
  test("the first card reads '1 Assign a room' with its hint; Room shows the first dirty room and Housekeeper shows Sunita", async () => {
    await work(async (api) => {
      await checkOut(api, '401');
      await checkOut(api, '115');
    });
    expect(screen.getByText('Harbour View · housekeeping')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Work' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: reading('1', 'Assign a room') })).toBeInTheDocument();
    expect(screen.getByText('A dirty room goes to one housekeeper. Dirty rooms are listed first.')).toBeInTheDocument();
    expect(within(roomDropDown()).getByText('Room 115')).toBeInTheDocument();
    expect(await within(housekeeperDropDown()).findByText('Sunita')).toBeInTheDocument();
  });

  test('the Room list holds every room with its type and state, dirty first, then to inspect, assigned, cleaning, ready and occupied, each in number order', async () => {
    const { user } = await work(async (api) => {
      await checkOut(api, '401');
      await checkOut(api, '115');
      await cleaned(api, '214', 'HK03');
      await checkOut(api, '415');
      await start(api, await assign(api, '415', 'HK04'));
      await checkOut(api, '101');
      await assign(api, '101', 'HK05');
      await madeReady(api, '215', 'HK06', 'HK01');
    });
    await user.click(roomDropDown());
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options).toHaveLength(60);
    const taken = ['115', '401', '214', '101', '415', '215'];
    const occupied = [1, 2, 3, 4].flatMap((f) => roomsFrom(`${f}01`, `${f}15`)).filter((no) => !taken.includes(no));
    expect(options.map((o) => within(o).getByText(/^Room \d/).textContent)).toEqual([...taken, ...occupied].map((no) => `Room ${no}`));
    const notes = [
      ['Deluxe · Dirty'], ['Standard · Dirty'], ['Deluxe · To inspect'], ['Standard · Assigned'], ['Deluxe · Cleaning'], ['Deluxe · Ready'],
    ];
    notes.forEach(([note], i) => expect(within(options[i]).getByText(note)).toBeInTheDocument());
    expect(within(options[6]).getByText('Standard · Occupied')).toBeInTheDocument();
  });

  test('the Housekeeper list holds the nine housekeepers by name, each with her code, HK01 to HK09', async () => {
    const { user } = await work();
    await within(housekeeperDropDown()).findByText('Sunita');
    await user.click(housekeeperDropDown());
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options).toHaveLength(9);
    options.forEach((o, i) => expect(within(o).getByText(`HK0${i + 1}`)).toBeInTheDocument());
    expect(within(options[0]).getByText('Grace')).toBeInTheDocument();
    expect(within(options[2]).getByText('Sunita')).toBeInTheDocument();
  });

  test("assigning dirty 214 to Sunita reads '214 is Sunita’s: assignment AS001.', and the board shows it on the door and her chip", async () => {
    const { user } = await work((api) => checkOut(api, '214'));
    await pick(user, roomDropDown(), 'Room 214');
    await pick(user, housekeeperDropDown(), 'Sunita');
    await user.click(assignButton());
    expect(await screen.findByText('214 is Sunita’s: assignment AS001.')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /^The board/ }));
    const door = await screen.findByRole('button', { name: 'Room 214, Deluxe, Assigned' });
    expect(within(door).getByText(reading('Sunita · 0m'))).toBeInTheDocument();
    expect(await screen.findByText(reading('HK03', 'Sunita', '214'))).toBeInTheDocument();
  });

  test("assigning 214 again when it is already Sunita's reads 'Somebody is already on that room', and nothing changes", async () => {
    const { user } = await work(async (api) => {
      await checkOut(api, '214');
      await assign(api, '214', 'HK03');
    });
    await pick(user, roomDropDown(), 'Room 214');
    await pick(user, housekeeperDropDown(), 'Grace');
    await user.click(assignButton());
    expect(await screen.findByText('Somebody is already on that room')).toBeInTheDocument();
    expect(screen.getByText('This room is already Sunita’s; it goes to one housekeeper at a time.')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /^The board/ }));
    expect(await screen.findByText(reading('HK03', 'Sunita', '214'))).toBeInTheDocument();
    expect(screen.getByText(reading('HK01', 'Grace', 'free'))).toBeInTheDocument();
  });

  test("assigning a room whose guest is still in reads 'A step was skipped' and 'This room still has its guest; check the guest out first.'", async () => {
    const { user } = await work();
    await pick(user, roomDropDown(), 'Room 214');
    await user.click(assignButton());
    expect(await screen.findByText('A step was skipped')).toBeInTheDocument();
    expect(screen.getByText(reading('This room still has its guest; check the guest out first.'))).toBeInTheDocument();
  });

  test("assigning a room that is already ready reads 'A step was skipped' and 'This room is already ready; nothing more is needed until the next guest checks in.'", async () => {
    const { user } = await work((api) => madeReady(api, '214', 'HK03', 'HK01'));
    await pick(user, roomDropDown(), 'Room 214');
    await user.click(assignButton());
    expect(await screen.findByText('A step was skipped')).toBeInTheDocument();
    expect(screen.getByText(reading('This room is already ready; nothing more is needed until the next guest checks in.'))).toBeInTheDocument();
  });

  test('changing the room or the housekeeper takes the green or red line away', async () => {
    const { user } = await work(async (api) => {
      await checkOut(api, '214');
      await checkOut(api, '215');
    });
    await pick(user, roomDropDown(), 'Room 214');
    await user.click(assignButton());
    expect(await screen.findByText('214 is Sunita’s: assignment AS001.')).toBeInTheDocument();
    await pick(user, roomDropDown(), 'Room 215');
    expect(screen.queryByText('214 is Sunita’s: assignment AS001.')).not.toBeInTheDocument();
    await pick(user, roomDropDown(), 'Room 214');
    await user.click(assignButton());
    expect(await screen.findByText('Somebody is already on that room')).toBeInTheDocument();
    await pick(user, housekeeperDropDown(), 'Grace');
    expect(screen.queryByText('Somebody is already on that room')).not.toBeInTheDocument();
  });

  test("dirty 214's drawer on the board says 'Dirty. Assign it on Work.', and the link opens Work with Room 214 chosen", async () => {
    const { address } = await openApp('/supervisor/board', {
      before: async (api) => {
        await checkOut(api, '115');
        await checkOut(api, '214');
      },
    });
    const user = person();
    await user.click(await screen.findByRole('button', { name: 'Room 214, Deluxe, Dirty' }));
    const drawer = screen.getByRole('dialog');
    expect(await within(drawer).findByText(reading('Dirty.', 'Assign it on Work', '.'))).toBeInTheDocument();
    await user.click(within(drawer).getByRole('link', { name: 'Assign it on Work' }));
    expect(address().startsWith('/supervisor/work?')).toBe(true);
    expect(Object.fromEntries(new URLSearchParams(address().split('?')[1]))).toEqual({ room: '214' });
    expect(await within(roomDropDown()).findByText('Room 214')).toBeInTheDocument();
  });

  test('by keyboard: a drop-down opens with Enter, Space or ↓, moves with ↓, picks with Enter and closes with Esc, and Enter presses Assign', async () => {
    const { user } = await work(async (api) => {
      await checkOut(api, '115');
      await checkOut(api, '214');
    });
    const rooms = roomDropDown();
    for (let i = 0; i < 20 && document.activeElement !== rooms; i += 1) await user.tab();
    expect(rooms).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.keyboard(' ');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.keyboard('{Enter}');
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}{Enter}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(within(roomDropDown()).getByText('Room 214')).toBeInTheDocument();
    await user.tab();
    expect(housekeeperDropDown()).toHaveFocus();
    await user.tab();
    expect(assignButton()).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(await screen.findByText('214 is Sunita’s: assignment AS001.')).toBeInTheDocument();
  });
});
