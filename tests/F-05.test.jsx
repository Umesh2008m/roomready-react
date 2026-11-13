import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { checkOut, clockAt, person } from './given.js';
import { reading } from './look.js';

// The ticket's own moment: Grace's band checks 214 out "at 10:40". The time box is filled with the screen's clock, so
// on this clock it reads today's date and 10:40 in India time; every guest checked in a day before the app opened.
const AT_1040 = new Date('2026-11-04T10:40:00+05:30');
const NOW_IN_BOX = '2026-11-04T10:40';
const LATER_TODAY = '2026-11-04T11:40';
const EARLIER_TODAY = '2026-11-04T09:40';
const TWO_DAYS_AGO = '2026-11-02T10:40';

const roomBox = () => screen.getByRole('textbox', { name: /Room/ });
const atBox = () => screen.getByLabelText(/Checked out at/);
const nextBox = () => screen.getByLabelText(/Next guest due/);
const checkOutButton = () => screen.getByRole('button', { name: 'Check out' });
const band = () => screen.getByRole('form', { name: 'Check a guest out' });

async function desk(before) {
  clockAt(AT_1040);
  const app = await openApp('/desk/checkout', { before });
  return { ...app, user: person() };
}

/** Puts a date and time into a date-and-time box, as typing it does. */
async function typeTime(user, box, value) {
  await user.clear(box);
  await user.type(box, value);
}

afterEach(() => vi.useRealTimers());

describe('F-05 · The front desk checks a guest out', () => {
  test('the form has its three numbered boxes with their help lines, the time already filled with now, and a Check out button', async () => {
    await desk();
    expect(screen.getByText('Harbour View · front desk')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Check out' })).toBeInTheDocument();
    expect(screen.getByText(reading('1', 'Room'))).toBeInTheDocument();
    expect(roomBox()).toHaveValue('');
    expect(screen.getByText('Rooms 101–115 up to 401–415.')).toBeInTheDocument();
    expect(screen.getByText(reading('2', 'Checked out at', '(India time)'))).toBeInTheDocument();
    expect(atBox()).toHaveValue(NOW_IN_BOX);
    expect(screen.getByText('Filled in with now. Not in the future, not before the guest checked in.')).toBeInTheDocument();
    expect(screen.getByText(reading('3', 'Next guest due', '(India time, optional)'))).toBeInTheDocument();
    expect(nextBox()).toHaveValue('');
    expect(screen.getByText('When the next guest for this room lands. The room’s margin is measured against it.')).toBeInTheDocument();
    expect(checkOutButton()).toBeInTheDocument();
  });

  test("before anything is checked out the panel reads 'Check a guest out'", async () => {
    await desk();
    expect(screen.getByText('Check a guest out')).toBeInTheDocument();
    expect(screen.getByText('The room turns dirty at once, and housekeeping sees it on the board.')).toBeInTheDocument();
  });

  test('a date-and-time box can be clicked and then typed into', async () => {
    const { user } = await desk();
    await user.click(atBox());
    await typeTime(user, atBox(), EARLIER_TODAY);
    expect(atBox()).toHaveValue(EARLIER_TODAY);
    await user.click(nextBox());
    await user.type(nextBox(), LATER_TODAY);
    expect(nextBox()).toHaveValue(LATER_TODAY);
  });

  test("checking 214 out makes door 214 Dirty on Grace's board and the Dirty count goes up by one", async () => {
    const { user } = await desk((api) => checkOut(api, '215'));
    await user.type(roomBox(), '214');
    await user.click(checkOutButton());
    await waitFor(() => expect(screen.queryByText('Check a guest out')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Pradeep/ }));
    await user.click(screen.getByRole('menuitem', { name: /Grace/ }));
    expect(await screen.findByRole('button', { name: 'Room 214, Deluxe, Dirty' })).toBeInTheDocument();
    expect(screen.getByText(reading('Dirty', '2'))).toBeInTheDocument();
  });

  test("with the Room box empty, 'Check out' shows 'Type the room number first.' under it and the panel says 'Something in the form is not right'", async () => {
    const { user } = await desk();
    await user.click(checkOutButton());
    expect((await screen.findAllByText('Type the room number first.')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Rooms 101–115 up to 401–415.')).not.toBeInTheDocument();
    expect(screen.getByText('Something in the form is not right')).toBeInTheDocument();
  });

  test("with 'Checked out at' cleared, 'Fill in when the guest checked out.' shows under that box", async () => {
    const { user } = await desk();
    await user.type(roomBox(), '214');
    await user.clear(atBox());
    await user.click(checkOutButton());
    expect((await screen.findAllByText('Fill in when the guest checked out.')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Filled in with now. Not in the future, not before the guest checked in.')).not.toBeInTheDocument();
  });

  test("a checkout time later than now shows 'The checkout time cannot be in the future.'", async () => {
    const { user } = await desk();
    await user.type(roomBox(), '214');
    await typeTime(user, atBox(), LATER_TODAY);
    await user.click(checkOutButton());
    expect((await screen.findAllByText('The checkout time cannot be in the future.')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Filled in with now. Not in the future, not before the guest checked in.')).not.toBeInTheDocument();
  });

  test("a checkout time before the guest checked in shows 'The checkout time cannot be before the guest checked in.'", async () => {
    const { user } = await desk();
    await user.type(roomBox(), '214');
    await typeTime(user, atBox(), TWO_DAYS_AGO);
    await user.click(checkOutButton());
    expect((await screen.findAllByText('The checkout time cannot be before the guest checked in.')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Filled in with now. Not in the future, not before the guest checked in.')).not.toBeInTheDocument();
  });

  test("a next guest due before the checkout shows 'The next guest cannot be due before the checkout.' under that box", async () => {
    const { user } = await desk();
    await user.type(roomBox(), '214');
    await user.type(nextBox(), EARLIER_TODAY);
    await user.click(checkOutButton());
    expect((await screen.findAllByText('The next guest cannot be due before the checkout.')).length).toBeGreaterThan(0);
    expect(screen.queryByText('When the next guest for this room lands. The room’s margin is measured against it.')).not.toBeInTheDocument();
    expect(screen.getByText('Filled in with now. Not in the future, not before the guest checked in.')).toBeInTheDocument();
  });

  test("room 999 makes the panel say 'No such room'", async () => {
    const { user } = await desk();
    await user.type(roomBox(), '999');
    await user.click(checkOutButton());
    expect(await screen.findByText('No such room')).toBeInTheDocument();
    expect(screen.getByText('There is no room with that number. Rooms run 101–115 up to 401–415.')).toBeInTheDocument();
  });

  test("checking 214 out a second time makes the panel say 'Nobody is in that room'", async () => {
    const { user } = await desk((api) => checkOut(api, '214'));
    await user.type(roomBox(), '214');
    await user.click(checkOutButton());
    expect(await screen.findByText('Nobody is in that room')).toBeInTheDocument();
    expect(screen.getByText('This room has no guest to check out. It was already checked out.')).toBeInTheDocument();
  });

  test('changing any box takes the red line and the message away', async () => {
    const { user } = await desk();
    await user.click(checkOutButton());
    expect((await screen.findAllByText('Type the room number first.')).length).toBeGreaterThan(0);
    await user.type(roomBox(), '2');
    expect(screen.queryByText('Type the room number first.')).not.toBeInTheDocument();
    expect(screen.queryByText('Something in the form is not right')).not.toBeInTheDocument();
    expect(screen.getByText('Rooms 101–115 up to 401–415.')).toBeInTheDocument();
    await user.click(checkOutButton());
    expect(await screen.findByText('No such room')).toBeInTheDocument();
    await user.type(nextBox(), LATER_TODAY);
    expect(screen.queryByText('No such room')).not.toBeInTheDocument();
  });

  test("Grace's board has a 'Check out' band with Room, Checked out at, Next guest due and a Check out button, each with its help line", async () => {
    clockAt(AT_1040);
    await openApp('/supervisor/board');
    const one = band();
    expect(within(one).getByText('Pradeep at the front desk · times in India time')).toBeInTheDocument();
    expect(within(one).getByRole('textbox', { name: /Room/ })).toHaveValue('');
    expect(within(one).getByPlaceholderText('e.g. 214')).toBeInTheDocument();
    expect(within(one).getByText('The guest’s room number')).toBeInTheDocument();
    expect(within(one).getByLabelText(/Checked out at/)).toHaveValue(NOW_IN_BOX);
    expect(within(one).getByText('Filled in with now · change it if the guest left earlier')).toBeInTheDocument();
    expect(within(one).getByText(reading('Next guest due', '(optional)'))).toBeInTheDocument();
    expect(within(one).getByLabelText(/Next guest due/)).toHaveValue('');
    expect(within(one).getByText('When the next guest for this room arrives')).toBeInTheDocument();
    expect(within(one).getByRole('button', { name: 'Check out' })).toBeInTheDocument();
  });

  test("checking 214 out from the band reads 'Room 214 checked out at 10:40 · stay ST0029 · now dirty.' and door 214 turns Dirty", async () => {
    clockAt(AT_1040);
    await openApp('/supervisor/board');
    const user = person();
    await screen.findByRole('button', { name: 'Room 214, Deluxe, Occupied' });
    await user.type(within(band()).getByRole('textbox', { name: /Room/ }), '214');
    await user.click(within(band()).getByRole('button', { name: 'Check out' }));
    expect(await within(band()).findByText(reading('Room 214 checked out at 10:40 · stay ST0029 · now dirty.'))).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Room 214, Deluxe, Dirty' })).toBeInTheDocument();
  });

  test('the band gives the same refusals as the desk, for an empty, an unknown and an already checked-out room', async () => {
    clockAt(AT_1040);
    await openApp('/supervisor/board', { before: (api) => checkOut(api, '214') });
    const user = person();
    const box = () => within(band()).getByRole('textbox', { name: /Room/ });
    const send = () => user.click(within(band()).getByRole('button', { name: 'Check out' }));
    await send();
    expect(await within(band()).findByText('Something in the form is not right')).toBeInTheDocument();
    expect(within(band()).getByText('Type the room number first.')).toBeInTheDocument();
    await user.type(box(), '999');
    await send();
    expect(await within(band()).findByText('No such room')).toBeInTheDocument();
    expect(within(band()).getByText('There is no room with that number. Rooms run 101–115 up to 401–415.')).toBeInTheDocument();
    await user.clear(box());
    await user.type(box(), '214');
    await send();
    expect(await within(band()).findByText('Nobody is in that room')).toBeInTheDocument();
    expect(within(band()).getByText('This room has no guest to check out. It was already checked out.')).toBeInTheDocument();
  });

  test('by keyboard: Tab goes Room, Checked out at, Next guest due, Check out', async () => {
    const { user } = await desk();
    for (let i = 0; i < 10 && document.activeElement !== roomBox(); i += 1) await user.tab();
    expect(roomBox()).toHaveFocus();
    await user.tab();
    expect(atBox()).toHaveFocus();
    await user.tab();
    expect(nextBox()).toHaveFocus();
    await user.tab();
    expect(checkOutButton()).toHaveFocus();
  });

  test('by keyboard: Enter in a box sends the form as the button does', async () => {
    const { user } = await desk();
    await user.click(roomBox());
    await user.keyboard('{Enter}');
    expect((await screen.findAllByText('Type the room number first.')).length).toBeGreaterThan(0);
    await user.type(roomBox(), '999{Enter}');
    expect(await screen.findByText('No such room')).toBeInTheDocument();
  });
});
