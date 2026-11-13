import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { assign, checkOut, cleaned, clockAt, finish, inspect, jump, MINUTE, person, start } from './given.js';
import { reading } from './look.js';

// The ticket's own morning: 214 checked out, cleaned in 23 minutes, passed by Grace at 12:20 for a guest due at
// 13:00 (40 minutes to spare); a late guest would have been due at 12:05.
const AT_1100 = new Date('2026-11-04T11:00:00+05:30');
const AT_1220 = new Date('2026-11-04T12:20:00+05:30');
const DUE_1300 = new Date('2026-11-04T13:00:00+05:30');
const DUE_1205 = new Date('2026-11-04T12:05:00+05:30');

/** 214's whole day: out at 11:00, assigned at 11:30 to Sunita, started 11:34, finished 11:57, inspected by Grace at 12:20. */
async function day214(api, { arrivalAt = DUE_1300, result = 'pass' } = {}) {
  await checkOut(api, '214', { arrivalAt });
  jump(30 * MINUTE);
  const id = await assign(api, '214', 'HK03');
  jump(4 * MINUTE);
  await start(api, id);
  jump(23 * MINUTE);
  await finish(api, id);
  jump(23 * MINUTE);
  await inspect(api, '214', 'HK01', result);
}

async function rooms(before) {
  clockAt(AT_1100);
  const app = await openApp('/manager/rooms', { before });
  await screen.findByRole('table');
  return { ...app, user: person() };
}

const card = (name) => screen.findByRole('heading', { name });
const notebook = () => screen.getByRole('dialog');

async function openDay(user, no = '214') {
  await user.click(await screen.findByRole('button', { name: `Open room ${no}’s day` }));
  await within(notebook()).findByText('What happened');
  return notebook();
}

afterEach(() => vi.useRealTimers());

describe('F-10 · Ready before arrival', () => {
  test("with every guest still in, Rooms says 'Every guest is still in'", async () => {
    await openApp('/manager/rooms');
    expect(screen.getByText('Harbour View · ready before arrival')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rooms' })).toBeInTheDocument();
    expect(await screen.findByText('Every guest is still in')).toBeInTheDocument();
    expect(screen.getByText('When Pradeep checks a room out, it appears here with its whole day.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  test('a table lists every room no longer occupied, in number order, with Room, Type, Now and an arrow button on each row', async () => {
    await rooms(async (api) => {
      await checkOut(api, '401');
      await checkOut(api, '214');
      await assign(api, '214', 'HK03');
      await checkOut(api, '101');
    });
    for (const head of ['Room', 'Type', 'Now']) expect(screen.getByRole('columnheader', { name: head })).toBeInTheDocument();
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getAllByRole('cell').slice(0, 3).map((c) => c.textContent))).toEqual([
      ['101', 'Standard', 'Dirty'], ['214', 'Deluxe', 'Assigned'], ['401', 'Standard', 'Dirty'],
    ]);
    for (const no of ['101', '214', '401']) expect(screen.getByRole('button', { name: `Open room ${no}’s card` })).toBeInTheDocument();
  });

  test('the card of the first ready room is shown when the page opens, or of the first room if none is ready', async () => {
    await rooms(async (api) => {
      await checkOut(api, '101');
      await day214(api);
    });
    expect(await card('Room 214 · Ready')).toBeInTheDocument();
  });

  test('with no room ready, the card of the first room in the table is shown', async () => {
    await rooms(async (api) => {
      await checkOut(api, '401');
      await checkOut(api, '101');
    });
    expect(await card('Room 101 · Dirty')).toBeInTheDocument();
  });

  test("clicking a row, or its arrow ('Open room 214’s card'), shows that room's card", async () => {
    const { user } = await rooms(async (api) => {
      await checkOut(api, '101');
      await checkOut(api, '214');
      await checkOut(api, '401');
    });
    await card('Room 101 · Dirty');
    await user.click(screen.getByRole('button', { name: 'Open room 214’s card' }));
    expect(await card('Room 214 · Dirty')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Room 101 · Dirty' })).not.toBeInTheDocument();
    await user.click(within(screen.getByRole('table')).getByText('401'));
    expect(await card('Room 401 · Dirty')).toBeInTheDocument();
  });

  test("214, passed at 12:20 for a guest due at 13:00, shows Ready '12:20', Guest due '13:00' and Margin '40 min'", async () => {
    await rooms(day214);
    expect(await card('Room 214 · Ready')).toBeInTheDocument();
    expect(await screen.findByText(reading('Ready', '12:20', 'passed inspection'))).toBeInTheDocument();
    expect(screen.getByText(reading('Guest due', '13:00', 'typed in at checkout'))).toBeInTheDocument();
    expect(screen.getByText(reading('Margin', '40 min', '40 min before the guest'))).toBeInTheDocument();
  });

  test("a room ready after its guest arrived shows the Margin as a minus figure, with '15 min after the guest'", async () => {
    await rooms((api) => day214(api, { arrivalAt: DUE_1205 }));
    expect(await screen.findByText(reading('Margin', '-15 min', '15 min after the guest'))).toBeInTheDocument();
    expect(screen.getByText(reading('Guest due', '12:05', 'typed in at checkout'))).toBeInTheDocument();
  });

  test("with no next guest given, Guest due and Margin both show '—' and 'no arrival known'", async () => {
    await rooms((api) => day214(api, { arrivalAt: null }));
    expect(await screen.findByText(reading('Guest due', '—', 'no arrival known'))).toBeInTheDocument();
    expect(screen.getByText(reading('Margin', '—', 'no arrival known'))).toBeInTheDocument();
    expect(screen.getByText(reading('Ready', '12:20', 'passed inspection'))).toBeInTheDocument();
  });

  test("a room that has not passed inspection in this stay says 'Not ready yet in this stay.'", async () => {
    await rooms((api) => cleaned(api, '214', 'HK03'));
    expect(await card('Room 214 · To inspect')).toBeInTheDocument();
    expect(screen.getByText('Not ready yet in this stay. Its card fills in once it passes inspection.')).toBeInTheDocument();
    expect(screen.queryByText('passed inspection')).not.toBeInTheDocument();
  });

  test("'Open room 214’s day' opens a notebook page with 'The room’s day · Harbour View', 'Room 214' and 'What happened', one line per step in time order", async () => {
    const { user } = await rooms(day214);
    const book = await openDay(user);
    expect(within(book).getByText('The room’s day · Harbour View')).toBeInTheDocument();
    expect(within(book).getByRole('heading', { name: 'Room 214' })).toBeInTheDocument();
    expect(within(book).getByText('Can’t be re-ticked')).toBeInTheDocument();
    const lines = within(book).getAllByRole('listitem');
    expect(lines).toHaveLength(5);
    const times = [/Wed 4 Nov, 11:00/, /Wed 4 Nov, 11:30/, /Wed 4 Nov, 11:34/, /Wed 4 Nov, 11:57/, /Wed 4 Nov, 12:20/];
    lines.forEach((line, i) => expect(line).toHaveTextContent(times[i]));
  });

  test("the day of a room that went all the way reads checked out, assigned to Sunita, started, finished in 23 min and passed by Grace", async () => {
    const { user } = await rooms(day214);
    const lines = within(await openDay(user)).getAllByRole('listitem');
    expect(within(lines[0]).getByText(reading('Guest checked out', /· the room is dirty/))).toBeInTheDocument();
    expect(within(lines[1]).getByText(reading('Assigned to Sunita', /· HK03/))).toBeInTheDocument();
    expect(within(lines[2]).getByText('Clean started')).toBeInTheDocument();
    expect(within(lines[3]).getByText(reading('Clean finished', /· 23 min/))).toBeInTheDocument();
    expect(within(lines[4]).getByText(reading('Passed by Grace', /· ready · 40 min before the guest/))).toBeInTheDocument();
  });

  test("a failed inspection's line reads 'Failed by Grace · back to dirty'", async () => {
    const { user } = await rooms((api) => day214(api, { result: 'fail' }));
    await screen.findByRole('heading', { name: 'Room 214 · Dirty' });
    const lines = within(await openDay(user)).getAllByRole('listitem');
    expect(within(lines.at(-1)).getByText(reading('Failed by Grace', /· back to dirty/))).toBeInTheDocument();
  });

  test("the day's head carries a stamp with the first word of the last line, 'Passed'", async () => {
    const { user } = await rooms(day214);
    const book = await openDay(user);
    expect(within(book).getByText('Passed')).toBeInTheDocument();
  });

  test("the box at the foot, 'How this page works', explains the page and ends 'Last line at 12:20.'", async () => {
    const { user } = await rooms(day214);
    const book = await openDay(user);
    expect(within(book).getByText('How this page works')).toBeInTheDocument();
    expect(within(book).getByText('Every step a room goes through adds a line here, written together with the step itself, with who did it. A refused step leaves no line. Lines are only ever added: when a guest is sent to an unclean room, this page says who signed it off and when.')).toBeInTheDocument();
    expect(within(book).getByText(reading('It opens over the page you are on. Close it with ×, Esc or a click outside and you are right where you were.', 'Last line at 12:20.'))).toBeInTheDocument();
  });

  test("× ('Close the notebook') closes the day and Mr Menon is exactly where he was", async () => {
    const { user, address } = await rooms(day214);
    await openDay(user);
    await user.click(within(notebook()).getByRole('button', { name: 'Close the notebook' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(address()).toBe('/manager/rooms');
    expect(screen.getByRole('heading', { name: 'Room 214 · Ready' })).toBeInTheDocument();
  });

  test('Esc closes the day and Mr Menon is exactly where he was', async () => {
    const { user, address } = await rooms(day214);
    await openDay(user);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(address()).toBe('/manager/rooms');
    expect(screen.getByRole('heading', { name: 'Room 214 · Ready' })).toBeInTheDocument();
  });

  test("on Grace's board, 'Open room 214’s day' in a drawer closes the drawer and opens the same day over the board", async () => {
    clockAt(AT_1100);
    const { address } = await openApp('/supervisor/board', { before: day214 });
    const user = person();
    await user.click(await screen.findByRole('button', { name: 'Room 214, Deluxe, Ready' }));
    await user.click(await within(screen.getByRole('dialog')).findByRole('button', { name: 'Open room 214’s day' }));
    expect(await within(screen.getByRole('dialog')).findByText('What happened')).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    expect(within(notebook()).getByRole('heading', { name: 'Room 214' })).toBeInTheDocument();
    expect(within(notebook()).getByText(reading('Passed by Grace', /· ready · 40 min before the guest/))).toBeInTheDocument();
    expect(address()).toBe('/supervisor/board');
  });

  test('by keyboard: Enter on a row arrow changes the card, Enter on its day button opens the day on ×, and Esc goes back to that button', async () => {
    const { user } = await rooms(async (api) => {
      await day214(api);
      await checkOut(api, '401');
    });
    await card('Room 214 · Ready');
    const arrow = screen.getByRole('button', { name: 'Open room 401’s card' });
    for (let i = 0; i < 20 && document.activeElement !== arrow; i += 1) await user.tab();
    expect(arrow).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(await card('Room 401 · Dirty')).toBeInTheDocument();
    const dayButton = screen.getByRole('button', { name: 'Open room 401’s day' });
    for (let i = 0; i < 20 && document.activeElement !== dayButton; i += 1) await user.tab();
    expect(dayButton).toHaveFocus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(within(notebook()).getByRole('button', { name: 'Close the notebook' })).toHaveFocus());
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open room 401’s day' })).toHaveFocus());
  });
});
