import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { checkOut, clockAt, inspect, jump, MINUTE, person, wait } from './given.js';
import { reading } from './look.js';

// The ticket's own times: Start at 10:52, and a clean of 23 minutes.
const AT_1052 = new Date('2026-11-04T10:52:00+05:30');

const button = (name) => screen.getByRole('button', { name });
const assignmentBox = () => screen.getByRole('textbox', { name: 'Assignment' });

/** Grace assigns dirty 214 to Sunita on Work, through the screen, at 10:52. */
async function assignedOnWork() {
  clockAt(AT_1052);
  const app = await openApp('/supervisor/work', { before: (api) => checkOut(api, '214') });
  const user = person();
  const room = screen.getAllByLabelText('Room')[0];
  await within(room).findByText('Room 214');
  expect(within(screen.getAllByLabelText('Housekeeper')[0]).getByText('Sunita')).toBeInTheDocument();
  await user.click(button(/^Assign/));
  await screen.findByText('214 is Sunita’s: assignment AS001.');
  return { ...app, user };
}

/** Grace switches to Sunita with the person menu, and Sunita's room is read. */
async function asSunita(user, state = 'Assigned') {
  await user.click(within(screen.getByRole('banner')).getByRole('button', { name: /Grace/ }));
  await user.click(screen.getByRole('menuitem', { name: /Sunita/ }));
  await screen.findByRole('heading', { name: `Room 214 · ${state}` });
}

afterEach(() => vi.useRealTimers());

describe("F-08 · The housekeeper's rooms", () => {
  test("with no room assigned to her, Sunita's screen says 'No room for you yet'", async () => {
    await openApp('/housekeeper');
    expect(screen.getByText('Sunita · HK03')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My rooms' })).toBeInTheDocument();
    expect(await screen.findByText('No room for you yet')).toBeInTheDocument();
    expect(screen.getByText('When Grace assigns you a dirty room, it appears here with Start and Finish.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Start/ })).not.toBeInTheDocument();
  });

  test("with 214 assigned to her, a card shows door 214, 'Room 214 · Assigned', what to do, and Start, Finish and 'Tick it myself'", async () => {
    const { user } = await assignedOnWork();
    await asSunita(user);
    expect(screen.getByText(reading('214', 'Dlx', 'Assigned'))).toBeInTheDocument();
    expect(screen.getByText('Yours to clean. Press Start when you open the door.')).toBeInTheDocument();
    expect(button(/^Start/)).toBeEnabled();
    expect(button(/^Finish/)).toBeEnabled();
    expect(button(/^Tick it myself/)).toBeEnabled();
    expect(screen.queryByText('No room for you yet')).not.toBeInTheDocument();
  });

  test("Start reads 'Started at 10:52.', the heading says Cleaning and the line says the clock is running", async () => {
    const { user } = await assignedOnWork();
    await asSunita(user);
    await user.click(button(/^Start/));
    expect(await screen.findByText('Started at 10:52.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Room 214 · Cleaning' })).toBeInTheDocument();
    expect(screen.getByText('The clock is running. Press Finish when the room is done.')).toBeInTheDocument();
  });

  test("Finish after 23 minutes reads 'Finished: 23 min.', the heading says To inspect and the line says somebody else will inspect it", async () => {
    const { user } = await assignedOnWork();
    await asSunita(user);
    await user.click(button(/^Start/));
    await screen.findByRole('heading', { name: 'Room 214 · Cleaning' });
    jump(23 * MINUTE);
    await user.click(button(/^Finish/));
    expect(await screen.findByText('Finished: 23 min.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Room 214 · To inspect' })).toBeInTheDocument();
    expect(screen.getByText('Done and timed. Somebody else will inspect it.')).toBeInTheDocument();
  });

  test("Finish before Start reads 'A step was skipped' and 'This room is assigned, but its clean has not started; start the clean first.'", async () => {
    const { user } = await assignedOnWork();
    await asSunita(user);
    await user.click(button(/^Finish/));
    expect(await screen.findByText('A step was skipped')).toBeInTheDocument();
    expect(screen.getByText(reading('This room is assigned, but its clean has not started; start the clean first.'))).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Room 214 · Assigned' })).toBeInTheDocument();
  });

  test("Start a second time reads 'A step was skipped' and 'This room is already being cleaned; finish the clean first.'", async () => {
    const { user } = await assignedOnWork();
    await asSunita(user);
    await user.click(button(/^Start/));
    await screen.findByRole('heading', { name: 'Room 214 · Cleaning' });
    await user.click(button(/^Start/));
    expect(await screen.findByText('A step was skipped')).toBeInTheDocument();
    expect(screen.getByText(reading('This room is already being cleaned; finish the clean first.'))).toBeInTheDocument();
  });

  test("'Tick it myself' on her own finished clean reads 'Somebody else must inspect it', and 214 stays To inspect", async () => {
    const { user } = await assignedOnWork();
    await asSunita(user);
    await user.click(button(/^Start/));
    await screen.findByRole('heading', { name: 'Room 214 · Cleaning' });
    await user.click(button(/^Finish/));
    await screen.findByRole('heading', { name: 'Room 214 · To inspect' });
    await user.click(button(/^Tick it myself/));
    expect(await screen.findByText('Somebody else must inspect it')).toBeInTheDocument();
    expect(screen.getByText('The inspector cleaned this room; somebody else must inspect it.')).toBeInTheDocument();
    await wait(1000);
    expect(screen.getByRole('heading', { name: 'Room 214 · To inspect' })).toBeInTheDocument();
  });

  test("once somebody else has inspected the room she finished, Sunita opening My rooms sees 'No room for you yet' again", async () => {
    const { user, api } = await assignedOnWork();
    await asSunita(user);
    await user.click(button(/^Start/));
    await screen.findByRole('heading', { name: 'Room 214 · Cleaning' });
    await user.click(button(/^Finish/));
    await screen.findByRole('heading', { name: 'Room 214 · To inspect' });
    await inspect(api, '214', 'HK01', 'pass');
    await user.click(screen.getByRole('link', { name: 'Back to the home page' }));
    await user.click(screen.getByText('Continue as Sunita'));
    expect(await screen.findByText('No room for you yet')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^Room 214/ })).not.toBeInTheDocument();
  });

  test("after Assign on Work, '2 Start and finish' holds AS001 and reads 'Room 214 is now Assigned.'", async () => {
    await assignedOnWork();
    expect(screen.getByRole('heading', { name: reading('2', 'Start and finish') })).toBeInTheDocument();
    expect(screen.getByText('Assigning a room fills in its assignment here. Start begins the clock; Finish stops it.')).toBeInTheDocument();
    expect(assignmentBox()).toHaveValue('AS001');
    expect(await screen.findByText(reading('Room 214 is now Assigned.'))).toBeInTheDocument();
  });

  test("on Work, Start then Finish read 'Started at 10:52.' and 'Finished: 23 min clean, stamped once.', and the room line follows", async () => {
    const { user } = await assignedOnWork();
    await user.click(button(/^Start$/));
    expect(await screen.findByText('Started at 10:52.')).toBeInTheDocument();
    expect(await screen.findByText(reading('Room 214 is now Cleaning.'))).toBeInTheDocument();
    jump(23 * MINUTE);
    await user.click(button(/^Finish$/));
    expect(await screen.findByText('Finished: 23 min clean, stamped once.')).toBeInTheDocument();
    expect(await screen.findByText(reading('Room 214 is now To inspect.'))).toBeInTheDocument();
  });

  test('on Work, with the Assignment box empty, Start and Finish are greyed out and do nothing', async () => {
    await openApp('/supervisor/work');
    const user = person();
    expect(assignmentBox()).toHaveValue('');
    expect(button(/^Start$/)).toBeDisabled();
    expect(button(/^Finish$/)).toBeDisabled();
    await user.click(button(/^Start$/));
    expect(screen.queryByText(/^Started at/)).not.toBeInTheDocument();
    expect(screen.queryByText('No such assignment')).not.toBeInTheDocument();
  });

  test("on Work, Start for AS999 reads 'No such assignment'", async () => {
    await openApp('/supervisor/work');
    const user = person();
    await user.type(assignmentBox(), 'AS999');
    await user.click(button(/^Start$/));
    expect(await screen.findByText('No such assignment')).toBeInTheDocument();
    expect(screen.getByText('There is no assignment with that code. Assigning a room gives it one, like AS001.')).toBeInTheDocument();
  });

  test("once 214's clean has finished, its drawer on the board shows 'Last clean' with the minutes, e.g. '23 min'", async () => {
    const { user } = await assignedOnWork();
    await user.click(button(/^Start$/));
    await screen.findByText('Started at 10:52.');
    jump(23 * MINUTE);
    await user.click(button(/^Finish$/));
    await screen.findByText('Finished: 23 min clean, stamped once.');
    await user.click(screen.getByRole('link', { name: /^The board/ }));
    await user.click(await screen.findByRole('button', { name: 'Room 214, Deluxe, To inspect' }));
    expect(await within(screen.getByRole('dialog')).findByText(reading('Last clean', '23 min'))).toBeInTheDocument();
  });

  test("by keyboard: Tab reaches Start, Finish and 'Tick it myself' in order on Sunita's card, and Enter or Space presses them", async () => {
    const { user } = await assignedOnWork();
    await asSunita(user);
    const start = button(/^Start/);
    for (let i = 0; i < 20 && document.activeElement !== start; i += 1) await user.tab();
    expect(start).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(await screen.findByText('Started at 10:52.')).toBeInTheDocument();
    await user.tab();
    expect(button(/^Finish/)).toHaveFocus();
    await user.keyboard(' ');
    expect(await screen.findByText(/^Finished: \d+ min\.$/)).toBeInTheDocument();
    await user.tab();
    expect(button(/^Tick it myself/)).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(await screen.findByText('Somebody else must inspect it')).toBeInTheDocument();
  });

  test('by keyboard: on Work, Tab skips the greyed-out Start and Finish', async () => {
    await openApp('/supervisor/work');
    const user = person();
    const box = assignmentBox();
    for (let i = 0; i < 30 && document.activeElement !== box; i += 1) await user.tab();
    expect(box).toHaveFocus();
    await user.tab();
    expect(button(/^Start$/)).not.toHaveFocus();
    expect(button(/^Finish$/)).not.toHaveFocus();
    expect(box).not.toHaveFocus();
  });
});
