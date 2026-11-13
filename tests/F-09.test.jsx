import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { assign, checkOut, cleaned, clockAt, jump, MINUTE, person, start } from './given.js';
import { reading } from './look.js';

// The ticket's own times: Grace inspects at 12:20; the next guest is due at 13:00 (or, late, at 12:05).
const AT_1220 = new Date('2026-11-04T12:20:00+05:30');
const LEFT_AT_1200 = new Date('2026-11-04T12:00:00+05:30');
const DUE_1300 = new Date('2026-11-04T13:00:00+05:30');
const DUE_1205 = new Date('2026-11-04T12:05:00+05:30');

// A second room for the cases that need two: 215, a Deluxe next to 214.
const R215 = '215';

const assignRoom = () => screen.getAllByLabelText('Room')[0];
const inspectRoom = () => screen.getAllByLabelText('Room')[1];
const inspectorDropDown = () => screen.getByLabelText('Inspector');
const recordButton = () => screen.getByRole('button', { name: /^Record the inspection/ });
const cleanTimes = () => screen.getByRole('region', { name: 'Clean time by type' });

async function work(before) {
  clockAt(AT_1220);
  const app = await openApp('/supervisor/work', { before });
  await within(inspectRoom()).findByText(/^Room \d/);
  await within(inspectorDropDown()).findByText('Grace');
  return { ...app, user: person() };
}

async function pick(user, dropDown, label) {
  await user.click(dropDown);
  await user.click(within(screen.getByRole('listbox')).getByText(label));
}

/** Sunita's finished clean of 214, checked out at 12:00 with the next guest due when given. */
const finished214 = (arrivalAt) => (api) => cleaned(api, '214', 'HK03', { at: LEFT_AT_1200, arrivalAt });

afterEach(() => vi.useRealTimers());

describe('F-09 · Inspecting', () => {
  test("the third card reads '3 Inspect' with its hint; Room shows the first room to inspect, Inspector shows Grace and Pass is pressed", async () => {
    await work(async (api) => {
      await checkOut(api, '115');
      await cleaned(api, '214', 'HK03');
    });
    expect(screen.getByRole('heading', { name: reading('3', 'Inspect') })).toBeInTheDocument();
    expect(screen.getByText('Somebody other than the cleaner passes or fails it. Rooms to inspect are listed first.')).toBeInTheDocument();
    expect(within(inspectRoom()).getByText('Room 214')).toBeInTheDocument();
    expect(within(inspectorDropDown()).getByText('Grace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pass', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fail', pressed: false })).toBeInTheDocument();
  });

  test("the Inspect card's Room list puts the rooms to inspect first, then the rest in the Assign list's order", async () => {
    const { user } = await work(async (api) => {
      await checkOut(api, '115');
      await cleaned(api, '401', 'HK03');
      await cleaned(api, '214', 'HK04');
      await checkOut(api, '101');
      await assign(api, '101', 'HK05');
    });
    const labels = () => within(screen.getByRole('listbox')).getAllByRole('option').map((o) => within(o).getByText(/^Room \d/).textContent);
    await user.click(assignRoom());
    const assignOrder = labels();
    await user.keyboard('{Escape}');
    await user.click(inspectRoom());
    const inspectOrder = labels();
    expect(inspectOrder.slice(0, 2)).toEqual(['Room 214', 'Room 401']);
    expect(inspectOrder.slice(2)).toEqual(assignOrder.filter((r) => !['Room 214', 'Room 401'].includes(r)));
    expect(inspectOrder).toHaveLength(60);
  });

  test("passing 214 at 12:20 with its guest due at 13:00 reads '214 is ready, 40 min before its guest.', and on the board 214 is Ready", async () => {
    const { user } = await work(finished214(DUE_1300));
    await user.click(recordButton());
    expect(await screen.findByText('214 is ready, 40 min before its guest.')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /^The board/ }));
    expect(await screen.findByRole('button', { name: 'Room 214, Deluxe, Ready' })).toBeInTheDocument();
    expect(screen.getByText(reading('Ready', '1'))).toBeInTheDocument();
  });

  test("passing 214 at 12:20 with its guest due at 12:05 reads '214 is ready, 15 min after its guest was due.'", async () => {
    const { user } = await work(finished214(DUE_1205));
    await user.click(recordButton());
    expect(await screen.findByText('214 is ready, 15 min after its guest was due.')).toBeInTheDocument();
  });

  test("passing 214 with no next guest given reads '214 is ready (no arrival known).'", async () => {
    const { user } = await work(finished214());
    await user.click(recordButton());
    expect(await screen.findByText('214 is ready (no arrival known).')).toBeInTheDocument();
  });

  test("Fail reads '214 failed: back to dirty, for a new assignment.', and 214 can be assigned again as AS002", async () => {
    const { user } = await work(finished214());
    await user.click(screen.getByRole('button', { name: 'Fail' }));
    await user.click(recordButton());
    expect(await screen.findByText('214 failed: back to dirty, for a new assignment.')).toBeInTheDocument();
    await pick(user, assignRoom(), 'Room 214');
    await user.click(screen.getByRole('button', { name: /^Assign$/ }));
    expect(await screen.findByText('214 is Sunita’s: assignment AS002.')).toBeInTheDocument();
  });

  test("Sunita inspecting the room she cleaned reads 'Somebody else must inspect it'", async () => {
    const { user } = await work(finished214());
    await pick(user, inspectorDropDown(), 'Sunita');
    await user.click(recordButton());
    expect(await screen.findByText('Somebody else must inspect it')).toBeInTheDocument();
    expect(screen.getByText('The inspector cleaned this room; somebody else must inspect it.')).toBeInTheDocument();
  });

  test("inspecting 214 while it is still being cleaned reads 'A step was skipped' and 'This room is already being cleaned; finish the clean first.'", async () => {
    const { user } = await work(async (api) => {
      await checkOut(api, '214');
      await start(api, await assign(api, '214', 'HK03'));
    });
    await pick(user, inspectRoom(), 'Room 214');
    await user.click(recordButton());
    expect(await screen.findByText('A step was skipped')).toBeInTheDocument();
    expect(screen.getByText(reading('This room is already being cleaned; finish the clean first.'))).toBeInTheDocument();
  });

  test("inspecting dirty 214 reads 'A step was skipped' and 'This room is dirty and nobody is on it yet; assign it first.'", async () => {
    const { user } = await work((api) => checkOut(api, '214'));
    await pick(user, inspectRoom(), 'Room 214');
    await user.click(recordButton());
    expect(await screen.findByText('A step was skipped')).toBeInTheDocument();
    expect(screen.getByText(reading('This room is dirty and nobody is on it yet; assign it first.'))).toBeInTheDocument();
  });

  test('changing the room, the inspector, or Pass and Fail takes the line away', async () => {
    const { user } = await work((api) => checkOut(api, '214'));
    const refused = async () => {
      await user.click(recordButton());
      expect(await screen.findByText('A step was skipped')).toBeInTheDocument();
    };
    await pick(user, inspectRoom(), 'Room 214');
    await refused();
    await pick(user, inspectRoom(), 'Room 101');
    expect(screen.queryByText('A step was skipped')).not.toBeInTheDocument();
    await refused();
    await pick(user, inspectorDropDown(), 'Sunita');
    expect(screen.queryByText('A step was skipped')).not.toBeInTheDocument();
    await refused();
    await user.click(screen.getByRole('button', { name: 'Fail' }));
    expect(screen.queryByText('A step was skipped')).not.toBeInTheDocument();
  });

  test("with no clean finished, 'Clean time by type' shows '—' and 'no clean finished yet' for Standard, Deluxe and Suite", async () => {
    await work();
    const card = cleanTimes();
    expect(within(card).getByText('From each Finish: the minutes stamped once, never recomputed.')).toBeInTheDocument();
    for (const type of ['Standard', 'Deluxe', 'Suite']) {
      expect(within(card).getByText(reading(type, '—', 'no clean finished yet'))).toBeInTheDocument();
    }
  });

  test("one Deluxe clean of 23 minutes shows Deluxe '23 min' and 'mean of 1 clean'", async () => {
    const { user } = await work((api) => checkOut(api, '214'));
    await pick(user, assignRoom(), 'Room 214');
    await user.click(screen.getByRole('button', { name: /^Assign$/ }));
    await user.click(await screen.findByRole('button', { name: /^Start$/ }));
    await screen.findByText(/^Started at/);
    jump(23 * MINUTE);
    await user.click(screen.getByRole('button', { name: /^Finish$/ }));
    expect(await within(cleanTimes()).findByText(reading('Deluxe', '23 min', 'mean of 1 clean'))).toBeInTheDocument();
    expect(within(cleanTimes()).getByText(reading('Standard', '—', 'no clean finished yet'))).toBeInTheDocument();
  });

  test("two Deluxe cleans of 20 and 26 minutes show Deluxe '23 min' and 'mean of 2 cleans'", async () => {
    const { user } = await work(async (api) => {
      await checkOut(api, '214');
      await checkOut(api, '215');
    });
    const box = () => screen.getByRole('textbox', { name: 'Assignment' });
    const press = async (name) => user.click(screen.getByRole('button', { name }));
    await pick(user, assignRoom(), 'Room 214');
    await press(/^Assign$/);
    await screen.findByText('214 is Sunita’s: assignment AS001.');
    await press(/^Start$/);
    await screen.findByText(/^Started at/);
    await pick(user, assignRoom(), 'Room 215');
    await pick(user, screen.getAllByLabelText('Housekeeper')[0], 'Grace');
    await press(/^Assign$/);
    await screen.findByText('215 is Grace’s: assignment AS002.');
    await press(/^Start$/);
    await screen.findByText(/^Started at/);
    jump(20 * MINUTE);
    await user.clear(box());
    await user.type(box(), 'AS001');
    await press(/^Finish$/);
    await screen.findByText(/^Finished: 20 min/);
    jump(6 * MINUTE);
    await user.clear(box());
    await user.type(box(), 'AS002');
    await press(/^Finish$/);
    await screen.findByText(/^Finished: 26 min/);
    expect(await within(cleanTimes()).findByText(reading('Deluxe', '23 min', 'mean of 2 cleans'))).toBeInTheDocument();
  });

  test("a room passed before its known guest makes the board's On time card read '1 of 1' with 'ready before their guest'", async () => {
    const { user } = await work(finished214(DUE_1300));
    await user.click(recordButton());
    await screen.findByText('214 is ready, 40 min before its guest.');
    await user.click(screen.getByRole('link', { name: /^The board/ }));
    expect(await screen.findByText(reading('On time', '1 of 1', 'ready before their guest'))).toBeInTheDocument();
  });

  test('a room made ready after its guest was due counts only in the second number of On time', async () => {
    const { user } = await work(async (api) => {
      await finished214(DUE_1300)(api);
      await cleaned(api, R215, 'HK03', { at: LEFT_AT_1200, arrivalAt: DUE_1205 });
    });
    await user.click(recordButton());
    await screen.findByText('214 is ready, 40 min before its guest.');
    await pick(user, inspectRoom(), `Room ${R215}`);
    await user.click(recordButton());
    await screen.findByText(`${R215} is ready, 15 min after its guest was due.`);
    await user.click(screen.getByRole('link', { name: /^The board/ }));
    expect(await screen.findByText(reading('On time', '1 of 2', 'ready before their guest'))).toBeInTheDocument();
  });

  test("by keyboard: the drop-downs work with Enter, ↓, ↑ and Esc, Pass and Fail press with Space or Enter, and Enter on 'Record the inspection' records it", async () => {
    const { user } = await work(async (api) => {
      await cleaned(api, '214', 'HK03');
      await cleaned(api, '215', 'HK04');
    });
    const rooms = inspectRoom();
    for (let i = 0; i < 40 && document.activeElement !== rooms; i += 1) await user.tab();
    expect(rooms).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}{Enter}');
    expect(within(inspectRoom()).getByText('Room 215')).toBeInTheDocument();
    await user.tab();
    expect(inspectorDropDown()).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Pass' })).toHaveFocus();
    await user.tab();
    await user.keyboard(' ');
    expect(screen.getByRole('button', { name: 'Fail', pressed: true })).toBeInTheDocument();
    await user.tab({ shift: true });
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Pass', pressed: true })).toBeInTheDocument();
    await user.tab();
    await user.tab();
    expect(recordButton()).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(await screen.findByText(`${R215} is ready (no arrival known).`)).toBeInTheDocument();
  });
});
