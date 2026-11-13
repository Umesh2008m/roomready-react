// The only door the screens use to reach RoomReady's backend. Each call answers a Promise of { status, body }, the
// shape a fetch wrapper gives. Here the backend runs inside the page (src/backend), so the request and the answer go
// through JSON on the way, exactly as they would over the network.
//
// To use the real MERN backend instead, keep the two names and swap their insides for fetch:
//   const API_URL = 'http://localhost:8080';
//   async function call(method, path, body) {
//     const res = await fetch(API_URL + path, {
//       method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
//     });
//     return { status: res.status, body: await res.json() };
//   }
import { handle } from './backend/routes.js';

const overTheWire = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

async function call(method, path, body) {
  const answer = handle(method, path, overTheWire(body));
  return { status: answer.status, body: overTheWire(answer.body) };
}

export const api = {
  get: (path) => call('GET', path),
  post: (path, body) => call('POST', path, body),
};
