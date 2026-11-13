import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { assign, checkOut, cleaned, clockAt, person, wait, WED_0900 } from './given.js';

const PEOPLE = [
  ['Grace', 'Supervisor · HK01'],
  ['Pradeep', 'Front desk'],
  ['Sunita', 'Housekeeper · HK03'],
  ['Mr Menon', 'General manager'],
];

const logo = () => screen.getByRole('link', { name: 'RoomReady home' });
const personButton = (name) => screen.getByRole('button', { name: new RegExp(name) });
const workTab = () => screen.getByRole('link', { name: /^Work/ });

async function openMenu(path = '/supervisor/board', name = 'Grace', options) {
  const app = await openApp(path, options);
  const user = person();
  await user.click(personButton(name));
  return { ...app, user, menu: screen.getByRole('menu') };
}

afterEach(() => vi.useRealTimers());

describe('F-02 · Moving between people', () => {
  test('on the welcome page the header has the logo with "Harbour View · 60 rooms" and no ← or person button', async () => {
    await openApp('/');
    expect(within(logo()).getByText('RoomReady')).toBeInTheDocument();
    expect(within(logo()).getByText('Harbour View · 60 rooms')).toBeInTheDocument();
    expect(screen.queryByLabelText('Back to the home page')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Grace|Pradeep|Sunita|Mr Menon/ })).not.toBeInTheDocument();
  });

  test("the logo on a person's screen opens the welcome page", async () => {
    for (const path of ['/supervisor/board', '/desk/checkout', '/housekeeper', '/manager/rooms']) {
      const { address } = await openApp(path);
      await person().click(logo());
      expect(address()).toBe('/');
      expect(screen.getByText('Who are you today?')).toBeInTheDocument();
      cleanup();
    }
  });

  test("the ← button (Back to the home page) on a person's screen opens the welcome page", async () => {
    for (const path of ['/supervisor/board', '/desk/checkout', '/housekeeper', '/manager/rooms']) {
      const { address } = await openApp(path);
      await person().click(screen.getByRole('link', { name: 'Back to the home page' }));
      expect(address()).toBe('/');
      expect(screen.getByText('Who are you today?')).toBeInTheDocument();
      cleanup();
    }
  });

  test("on Pradeep's screen the person button shows his avatar, his name and 'Front desk'", async () => {
    await openApp('/desk/checkout');
    const button = personButton('Pradeep');
    expect(within(button).getByText('Pradeep')).toBeInTheDocument();
    expect(within(button).getByText('Front desk')).toBeInTheDocument();
    expect(within(button).getByText('P')).toBeInTheDocument();
  });

  test('the person button opens "View the hotel as" with the four people and their roles', async () => {
    const { menu } = await openMenu();
    expect(within(menu).getByText('View the hotel as')).toBeInTheDocument();
    const options = within(menu).getAllByRole('menuitem');
    expect(options).toHaveLength(4);
    PEOPLE.forEach(([name, role], i) => {
      expect(within(options[i]).getByText(name)).toBeInTheDocument();
      expect(within(options[i]).getByText(role)).toBeInTheDocument();
    });
  });

  test("choosing Pradeep on Grace's board closes the menu, opens Check out and shows Pradeep in the header", async () => {
    const { user, menu, address } = await openMenu();
    await user.click(within(menu).getByRole('menuitem', { name: /Pradeep/ }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(address()).toBe('/desk/checkout');
    expect(personButton('Pradeep')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Grace/ })).not.toBeInTheDocument();
  });

  test('Esc closes the menu and you stay on the same screen', async () => {
    const { user, address } = await openMenu();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(address()).toBe('/supervisor/board');
    expect(personButton('Grace')).toBeInTheDocument();
  });

  test('a click outside the menu closes it and you stay on the same screen', async () => {
    const { user, address } = await openMenu();
    await user.click(screen.getByRole('main'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(address()).toBe('/supervisor/board');
    expect(personButton('Grace')).toBeInTheDocument();
  });

  test("Grace's title row has the tabs 'The board' and 'Work', the current one marked, and each opens the other", async () => {
    const { address } = await openApp('/supervisor/board');
    const user = person();
    expect(screen.getByRole('link', { name: /^The board/, current: 'page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Work/, current: false })).toBeInTheDocument();
    await user.click(workTab());
    expect(screen.getByRole('link', { name: /^Work/, current: 'page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^The board/, current: false })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /^The board/ }));
    expect(address()).toBe('/supervisor/board');
  });

  test("Pradeep's, Sunita's and Mr Menon's screens have no tabs", async () => {
    for (const [path, name] of [['/desk/checkout', 'Pradeep'], ['/housekeeper', 'Sunita'], ['/manager/rooms', 'Mr Menon']]) {
      await openApp(path);
      expect(personButton(name)).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^The board/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^Work/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^Check out/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^My rooms/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^Rooms/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
      cleanup();
    }
  });

  test('with every guest still in the Work tab has no badge', async () => {
    clockAt(WED_0900);
    await openApp('/supervisor/board');
    await wait(1000);
    expect(workTab()).toHaveAccessibleName('Work');
    expect(within(workTab()).queryByText(/\d/)).not.toBeInTheDocument();
  });

  test('with two rooms dirty and one waiting for inspection the Work tab counts 3', async () => {
    await openApp('/supervisor/board', {
      before: async (api) => {
        await checkOut(api, '101');
        await checkOut(api, '102');
        await cleaned(api, '103', 'HK03');
      },
    });
    expect(await within(workTab()).findByText('3')).toBeInTheDocument();
  });

  test('the Work badge changes when one of its rooms moves on, without anything clicked here', async () => {
    clockAt(WED_0900);
    const { api } = await openApp('/supervisor/board', {
      before: async (a) => {
        await checkOut(a, '101');
        await checkOut(a, '102');
        await checkOut(a, '103');
      },
    });
    expect(await within(workTab()).findByText('3')).toBeInTheDocument();
    await assign(api, '101', 'HK03');
    await wait(20_000);
    expect(await within(workTab()).findByText('2')).toBeInTheDocument();
  });

  test('/supervisor, /desk and /manager land on /supervisor/board, /desk/checkout and /manager/rooms', async () => {
    for (const [short, full] of [['/supervisor', '/supervisor/board'], ['/desk', '/desk/checkout'], ['/manager', '/manager/rooms']]) {
      const { address } = await openApp(short);
      expect(address()).toBe(full);
      cleanup();
    }
  });

  test('an address the app does not know, such as /kitchen, lands on the welcome page', async () => {
    const { address } = await openApp('/kitchen');
    expect(address()).toBe('/');
    expect(screen.getByText('Who are you today?')).toBeInTheDocument();
  });

  test('by keyboard: Tab to the person button and Enter opens the menu', async () => {
    await openApp('/desk/checkout');
    const user = person();
    const button = personButton('Pradeep');
    for (let i = 0; i < 10 && document.activeElement !== button; i += 1) await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(within(screen.getByRole('menu')).getByText('View the hotel as')).toBeInTheDocument();
  });

  test('by keyboard: Tab reaches each person in the menu and Enter picks one', async () => {
    const { address } = await openApp('/desk/checkout');
    const user = person();
    const button = personButton('Pradeep');
    for (let i = 0; i < 10 && document.activeElement !== button; i += 1) await user.tab();
    await user.keyboard('{Enter}');
    const menu = screen.getByRole('menu');
    const seen = [];
    for (let i = 0; i < 8 && seen.length < 4; i += 1) {
      await user.tab();
      const option = within(menu).queryAllByRole('menuitem').find((o) => o === document.activeElement);
      if (option && !seen.includes(option)) seen.push(option);
    }
    expect(seen).toHaveLength(4);
    const sunita = within(menu).getByRole('menuitem', { name: /Sunita/ });
    for (let i = 0; i < 8 && document.activeElement !== sunita; i += 1) await user.tab({ shift: true });
    expect(sunita).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(address()).toBe('/housekeeper');
    expect(personButton('Sunita')).toBeInTheDocument();
  });

  test('by keyboard: Esc closes the menu and puts the focus back on the person button', async () => {
    const { address } = await openApp('/desk/checkout');
    const user = person();
    const button = personButton('Pradeep');
    for (let i = 0; i < 10 && document.activeElement !== button; i += 1) await user.tab();
    await user.keyboard('{Enter}');
    await user.tab();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(personButton('Pradeep')).toHaveFocus();
    expect(address()).toBe('/desk/checkout');
  });
});
