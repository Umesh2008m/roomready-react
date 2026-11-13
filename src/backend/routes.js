// The app's "server": a method and a path find the endpoint, its request parts are checked as the MERN routers check
// them, and the feature's service answers. Every answer is { status, body }; every refusal has the one problem shape.
import { Refusal, validation } from './errors.js';
import { assign, finish, start } from './assignments/service.js';
import { checkout } from './checkouts/service.js';
import { inspect } from './inspections/service.js';
import { board, history, housekeepers, room } from './rooms/service.js';

// ── Checking a request part: one message per bad field, worded as the MERN backend's validation words it ──
const STATES = ['occupied', 'dirty', 'assigned', 'cleaning', 'toinspect', 'ready', 'out_of_order'];
const TYPES = ['Standard', 'Deluxe', 'Suite'];

const kindOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);

function text(v) {
  if (v === undefined) return 'Required';
  if (typeof v !== 'string') return `Expected string, received ${kindOf(v)}`;
  return v.length < 1 ? 'String must contain at least 1 character(s)' : null;
}

/** An instant with its zone (Z or an offset), to the second. */
function instant(v, optional = false) {
  if (v === undefined) return optional ? null : 'Required';
  if (typeof v !== 'string') return `Expected string, received ${kindOf(v)}`;
  const ok = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/.test(v) && !Number.isNaN(Date.parse(v));
  return ok ? null : 'Invalid datetime';
}

function oneOf(values, v, optional = false) {
  if (v === undefined) return optional ? null : 'Required';
  return values.includes(v) ? null : `Invalid enum value. Expected ${values.map((x) => `'${x}'`).join(' | ')}, received '${v}'`;
}

/** The board's floor: a whole number from 1 to 4 (every rule it breaks is listed). */
function floorNumber(v) {
  if (v === undefined) return [];
  const n = Number(v);
  if (Number.isNaN(n)) return ['Expected number, received nan'];
  const broken = [];
  if (!Number.isInteger(n)) broken.push('Expected integer, received float');
  if (n < 1) broken.push('Number must be greater than or equal to 1');
  if (n > 4) broken.push('Number must be less than or equal to 4');
  return broken;
}

/** Throws one validation refusal naming every field whose check gave a message. */
function check(fields) {
  const errors = fields.flatMap(([field, messages]) => [messages].flat().filter(Boolean).map((message) => ({ field, message })));
  if (errors.length) throw validation(errors);
}

// ── The endpoints the screens use ──
const P = '/properties/([^/]+)';
const ROUTES = [
  {
    method: 'GET', path: new RegExp(`^${P}/rooms$`),
    run: ([property], query) => {
      check([['floor', floorNumber(query.floor)], ['state', oneOf(STATES, query.state, true)], ['type', oneOf(TYPES, query.type, true)]]);
      const floor = query.floor === undefined ? undefined : Number(query.floor);
      return { status: 200, body: board(property, { floor, state: query.state, type: query.type }) };
    },
  },
  { method: 'GET', path: new RegExp(`^${P}/rooms/([^/]+)$`), run: ([property, no]) => ({ status: 200, body: room(property, no) }) },
  { method: 'GET', path: new RegExp(`^${P}/rooms/([^/]+)/history$`), run: ([property, no]) => ({ status: 200, body: history(property, no) }) },
  { method: 'GET', path: new RegExp(`^${P}/housekeepers$`), run: ([property]) => ({ status: 200, body: housekeepers(property) }) },
  {
    method: 'POST', path: /^\/checkouts$/,
    run: (_, __, body) => {
      check([['room', text(body.room)], ['at', instant(body.at)], ['arrivalAt', instant(body.arrivalAt, true)]]);
      return { status: 201, body: checkout(body) };
    },
  },
  {
    method: 'POST', path: /^\/assignments$/,
    run: (_, __, body) => {
      check([['room', text(body.room)], ['housekeeper', text(body.housekeeper)]]);
      return { status: 201, body: assign(body) };
    },
  },
  { method: 'POST', path: /^\/assignments\/([^/]+)\/start$/, run: ([id]) => ({ status: 200, body: start(id) }) },
  { method: 'POST', path: /^\/assignments\/([^/]+)\/finish$/, run: ([id]) => ({ status: 200, body: finish(id) }) },
  {
    method: 'POST', path: /^\/inspections$/,
    run: (_, __, body) => {
      check([['room', text(body.room)], ['inspector', text(body.inspector)], ['result', oneOf(['pass', 'fail'], body.result)]]);
      return { status: 201, body: inspect(body) };
    },
  },
];

function problem(path, { status, type, title, detail }, extras = {}) {
  return { status, body: { type, title, status, detail, instance: path, ...extras } };
}

/** Answers one request: { status, body }. A path nobody serves is a 404; anything unexpected is a 500. */
export function handle(method, url, body = {}) {
  const [path, queryText = ''] = url.split('?');
  const query = Object.fromEntries(new URLSearchParams(queryText));
  const route = ROUTES.find((r) => r.method === method && r.path.test(path));
  if (!route) return problem(path, { status: 404, type: 'about:blank', title: 'Not Found', detail: `Nothing is served at ${path}` });
  try {
    const params = path.match(route.path).slice(1).map(decodeURIComponent);
    return route.run(params, query, body ?? {});
  } catch (error) {
    if (error instanceof Refusal) return problem(path, { ...error, detail: error.message }, error.extras);
    return problem(path, { status: 500, type: '/errors/internal', title: 'Internal error', detail: 'Something went wrong on our side' });
  }
}
