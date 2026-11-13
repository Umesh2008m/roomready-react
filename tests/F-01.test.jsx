import { screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { openApp } from './app.jsx';
import { checkOut, person, roomsFrom } from './given.js';
import { reading } from './look.js';

const PEOPLE = [
  ['Grace', 'Supervisor · HK01', 'Runs housekeeping. Sees every room, assigns the dirty ones and inspects what others cleaned.'],
  ['Pradeep', 'Front desk', 'Checks guests out at the desk. The room turns dirty the moment he does.'],
  ['Sunita', 'Housekeeper · HK03', 'Cleans the rooms she is given. Starts the clock when she begins and stops it when she is done.'],
  ['Mr Menon', 'General manager', "Judges the morning on one number: how long before the guest each room was ready."],
];

const card = (name) => screen.getByRole('link', { name: new RegExp(`Continue as ${name}`) });

describe('F-01 · The front door', () => {
  test('the welcome page names the hotel, has the two-line heading and says what the board is for', async () => {
    await openApp('/');
    expect(screen.getByText('Harbour View · housekeeping')).toBeInTheDocument();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(within(heading).getByText('Sixty rooms.')).toBeInTheDocument();
    expect(within(heading).getByText('No clipboard upstairs.')).toBeInTheDocument();
    expect(
      screen.getByText(reading(
        "Every room moves from occupied to dirty, cleaned, inspected and ready, raced against the day's arrivals.",
        'The board knows where each one is, who is on it, and how long before its guest it was ready.',
      )),
    ).toBeInTheDocument();
  });

  test('with every guest still in the counts read 60 rooms, 0 ready and 0 dirty', async () => {
    await openApp('/');
    expect(await screen.findByText(reading('60', 'rooms'))).toBeInTheDocument();
    expect(screen.getByText(reading('0', 'ready'))).toBeInTheDocument();
    expect(screen.getByText(reading('0', 'dirty'))).toBeInTheDocument();
  });

  test('with one room checked out the dirty count reads 1 and the other counts are unchanged', async () => {
    await openApp('/', { before: (api) => checkOut(api, '213') });
    expect(await screen.findByText(reading('1', 'dirty'))).toBeInTheDocument();
    expect(screen.getByText(reading('60', 'rooms'))).toBeInTheDocument();
    expect(screen.getByText(reading('0', 'ready'))).toBeInTheDocument();
  });

  test('the picture shows rooms 209 to 215 of floor 2, each with its number and its state', async () => {
    await openApp('/');
    await screen.findByText('209');
    for (const no of roomsFrom('209', '215')) expect(screen.getByText(reading(no, /occupied/i))).toBeInTheDocument();
    expect(screen.getAllByText(/^\d\d\d$/)).toHaveLength(7);
  });

  test('the picture follows the hotel: a checked-out 213 shows as Dirty', async () => {
    await openApp('/', { before: (api) => checkOut(api, '213') });
    expect(await screen.findByText(reading('213', /Dirty/))).toBeInTheDocument();
    expect(screen.getByText(reading('215', /occupied/i))).toBeInTheDocument();
  });

  test('the doors are only a picture: clicking one does nothing', async () => {
    const { address } = await openApp('/');
    const user = person();
    await user.click(await screen.findByText('209'));
    await user.click(screen.getByText('213'));
    expect(address()).toBe('/');
    expect(screen.getByText('Who are you today?')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('under "Who are you today?" four cards show Grace, Pradeep, Sunita and Mr Menon with their roles and blurbs', async () => {
    await openApp('/');
    expect(screen.getByText('Who are you today?')).toBeInTheDocument();
    expect(screen.getByText('Each person sees their own screens. Everything they do changes the same hotel.')).toBeInTheDocument();
    for (const [name, role, blurb] of PEOPLE) {
      const one = card(name);
      expect(within(one).getByText(name)).toBeInTheDocument();
      expect(within(one).getByText(role)).toBeInTheDocument();
      expect(within(one).getByText(blurb)).toBeInTheDocument();
      expect(within(one).getByText(`Continue as ${name}`)).toBeInTheDocument();
    }
  });

  test("clicking 'Continue as Grace' changes the address to /supervisor/board", async () => {
    const { address } = await openApp('/');
    await person().click(screen.getByText('Continue as Grace'));
    expect(address()).toBe('/supervisor/board');
  });

  test("clicking 'Continue as Pradeep' changes the address to /desk/checkout", async () => {
    const { address } = await openApp('/');
    await person().click(screen.getByText('Continue as Pradeep'));
    expect(address()).toBe('/desk/checkout');
  });

  test("clicking 'Continue as Sunita' changes the address to /housekeeper", async () => {
    const { address } = await openApp('/');
    await person().click(screen.getByText('Continue as Sunita'));
    expect(address()).toBe('/housekeeper');
  });

  test("clicking 'Continue as Mr Menon' changes the address to /manager/rooms", async () => {
    const { address } = await openApp('/');
    await person().click(screen.getByText('Continue as Mr Menon'));
    expect(address()).toBe('/manager/rooms');
  });

  test('Tab moves through the four cards in order', async () => {
    await openApp('/');
    const user = person();
    const grace = card('Grace');
    for (let i = 0; i < 10 && document.activeElement !== grace; i += 1) await user.tab();
    expect(grace).toHaveFocus();
    for (const [name] of PEOPLE.slice(1)) {
      await user.tab();
      expect(card(name)).toHaveFocus();
    }
  });

  test("Enter on a focused card opens that person's screen", async () => {
    const { address } = await openApp('/');
    const user = person();
    const sunita = card('Sunita');
    for (let i = 0; i < 10 && document.activeElement !== sunita; i += 1) await user.tab();
    expect(sunita).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(address()).toBe('/housekeeper');
  });
});
