import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { assign, checkOut, clockAt, jump, MINUTE, person, wait } from './given.js';
import { reading } from './look.js';

// 10:40 in the hotel, the time the tickets check 214 out at; five minutes later the form fills in the new now.
const AT_1040 = new Date('2026-11-04T10:40:00+05:30');
const NOW_IN_BOX_LATER = '2026-11-04T10:45';
const NEXT_GUEST_AT = '2026-11-04T14:00';

const roomBox = () => screen.getByRole('textbox', { name: /Room/ });
const atBox = () => screen.getByLabelText(/Checked out at/);
const nextBox = () => screen.getByLabelText(/Next guest due/);
const keyCard = () => screen.getByRole('button', { name: 'Key card for room 214. Take it back' });
const okButton = () => screen.getByRole('button', { name: 'OK, next guest' });
/** The doors on the desk that show room 214 in this state, read the way a person reads a door. */
const doors214 = (state) => screen.queryAllByText(reading('214', state));
/** The doors in the row of rooms checked out this morning, when no step panel is showing: their numbers, in order. */
const rowNumbers = () => screen.queryAllByText(/^\d\d\d$/).map((n) => n.textContent);

async function deskCheckout({ nextGuest, before } = {}) {
  clockAt(AT_1040);
  const app = await openApp('/desk/checkout', { before });
  const user = person();
  await user.type(roomBox(), '214');
  if (nextGuest) await user.type(nextBox(), nextGuest);
  await user.click(screen.getByRole('button', { name: 'Check out' }));
  await screen.findByRole('button', { name: 'Key card for room 214. Take it back' });
  return { ...app, user };
}

afterEach(() => vi.useRealTimers());

describe('F-06 · Taking back the key', () => {
  test("after checking 214 out, step 1 is current, door 214 still shows Occupied and the Harbour View key card waits beside it", async () => {
    await deskCheckout();
    expect(screen.getByText(reading('1', 'Take back the key card'))).toBeInTheDocument();
    expect(screen.getByText(reading('2', 'Room marked dirty'))).toBeInTheDocument();
    expect(doors214(/Occupied/)).toHaveLength(1);
    expect(within(keyCard()).getByText('Harbour View')).toBeInTheDocument();
    expect(within(keyCard()).getByText('214')).toBeInTheDocument();
    expect(screen.getByText(reading('Drag the key card onto room 214'))).toBeInTheDocument();
    expect(screen.getByText('Or tap the card. The guest has checked out.')).toBeInTheDocument();
    expect(screen.queryByText('Check a guest out')).not.toBeInTheDocument();
  });

  test("while the step panel shows, the three boxes and the 'Check out' button are locked", async () => {
    const { user } = await deskCheckout();
    for (const box of [roomBox(), atBox(), nextBox()]) expect(box).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Check out' })).toBeDisabled();
    await user.type(roomBox(), '5');
    expect(roomBox()).toHaveValue('214');
  });

  test("tapping the key card takes it away, ticks step 1 and reads 'Marking the room dirty…'", async () => {
    const { user } = await deskCheckout();
    await user.click(keyCard());
    expect(screen.queryByRole('button', { name: 'Key card for room 214. Take it back' })).not.toBeInTheDocument();
    expect(screen.getByText('Marking the room dirty…')).toBeInTheDocument();
    expect(screen.getByText('Take back the key card')).toBeInTheDocument();
    expect(screen.queryByText(reading('1', 'Take back the key card'))).not.toBeInTheDocument();
    expect(screen.queryByText('Or tap the card. The guest has checked out.')).not.toBeInTheDocument();
  });

  test("within a second of the key coming back, door 214 turns Dirty, step 2 is ticked and the caption reads 'Room 214 is dirty'", async () => {
    const { user } = await deskCheckout();
    await screen.findByText(reading('Checked out this morning', '1'));
    const dirtyBefore = doors214(/Dirty/).length;
    await user.click(keyCard());
    await wait(1000);
    expect(screen.getByText(reading('Room 214 is dirty'))).toBeInTheDocument();
    expect(screen.getByText('Grace sees it on her board now.')).toBeInTheDocument();
    expect(doors214(/Occupied/)).toHaveLength(0);
    expect(doors214(/Dirty/)).toHaveLength(dirtyBefore + 1);
    expect(screen.getByText('Room marked dirty')).toBeInTheDocument();
    expect(screen.queryByText(reading('2', 'Room marked dirty'))).not.toBeInTheDocument();
    expect(screen.queryByText('Marking the room dirty…')).not.toBeInTheDocument();
  });

  test("once dirty the panel shows the Stay and 'Left at'; with no next guest given there is no 'Next guest' line", async () => {
    const { user } = await deskCheckout();
    await user.click(keyCard());
    await wait(1000);
    expect(screen.getByText(reading('Stay', 'ST0029'))).toBeInTheDocument();
    expect(screen.getByText(reading('Left at', '10:40'))).toBeInTheDocument();
    expect(screen.queryByText('Next guest')).not.toBeInTheDocument();
  });

  test("with a next guest given, the dirty room's panel also shows 'Next guest' with that time", async () => {
    const { user } = await deskCheckout({ nextGuest: NEXT_GUEST_AT });
    await user.click(keyCard());
    await wait(1000);
    expect(screen.getByText(reading('Stay', 'ST0029'))).toBeInTheDocument();
    expect(screen.getByText(reading('Left at', '10:40'))).toBeInTheDocument();
    expect(screen.getByText(reading('Next guest', '14:00'))).toBeInTheDocument();
  });

  test("'OK, next guest' brings back 'Check a guest out' and an unlocked, empty form with the new now", async () => {
    const { user } = await deskCheckout({ nextGuest: NEXT_GUEST_AT });
    await user.click(keyCard());
    await wait(1000);
    jump(5 * MINUTE);
    await user.click(okButton());
    expect(screen.getByText('Check a guest out')).toBeInTheDocument();
    expect(screen.queryByText(reading('Room 214 is dirty'))).not.toBeInTheDocument();
    expect(roomBox()).toBeEnabled();
    expect(roomBox()).toHaveValue('');
    expect(nextBox()).toHaveValue('');
    expect(atBox()).toHaveValue(NOW_IN_BOX_LATER);
    expect(screen.getByRole('button', { name: 'Check out' })).toBeEnabled();
  });

  test("with every guest still in, 'Checked out this morning' counts 0 and says 'Every guest is still in'", async () => {
    await openApp('/desk/checkout');
    expect(await screen.findByText('Every guest is still in')).toBeInTheDocument();
    expect(screen.getByText(reading('Checked out this morning', '0'))).toBeInTheDocument();
    expect(screen.getByText('Check a room out above; it appears here and on Grace’s board.')).toBeInTheDocument();
  });

  test("'Checked out this morning' counts the checked-out rooms and shows their doors in number order with their state now", async () => {
    await openApp('/desk/checkout', {
      before: async (api) => {
        await checkOut(api, '401');
        await checkOut(api, '115');
        await assign(api, '115', 'HK03');
      },
    });
    expect(await screen.findByText(reading('Checked out this morning', '2'))).toBeInTheDocument();
    expect(rowNumbers()).toEqual(['115', '401']);
    expect(screen.getByText(reading('115', /Assigned/))).toBeInTheDocument();
    expect(screen.getByText(reading('401', /Dirty/))).toBeInTheDocument();
    expect(screen.queryByText('Every guest is still in')).not.toBeInTheDocument();
  });

  test('door 214 joins the row as soon as its checkout goes through, and changes as its clean moves on', async () => {
    const { api } = await deskCheckout();
    expect(await screen.findByText(reading('Checked out this morning', '1'))).toBeInTheDocument();
    expect(doors214(/Dirty/)).toHaveLength(1);
    await assign(api, '214', 'HK03');
    await wait(20_000);
    expect(await screen.findByText(reading('214', /Assigned/))).toBeInTheDocument();
  });

  test("by keyboard: Tab to the key card and Enter takes it back, then Enter on 'OK, next guest' starts the next guest", async () => {
    const { user } = await deskCheckout();
    const card = keyCard();
    for (let i = 0; i < 20 && document.activeElement !== card; i += 1) await user.tab();
    expect(card).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Marking the room dirty…')).toBeInTheDocument();
    await wait(1000);
    await waitFor(() => expect(okButton()).toHaveFocus());
    await user.keyboard('{Enter}');
    expect(screen.getByText('Check a guest out')).toBeInTheDocument();
    expect(roomBox()).toHaveValue('');
  });

  test('by keyboard: Space on the key card takes it back as a tap does', async () => {
    const { user } = await deskCheckout();
    const card = keyCard();
    for (let i = 0; i < 20 && document.activeElement !== card; i += 1) await user.tab();
    await user.keyboard(' ');
    expect(screen.getByText('Marking the room dirty…')).toBeInTheDocument();
    await wait(1000);
    expect(screen.getByText(reading('Room 214 is dirty'))).toBeInTheDocument();
  });
});
