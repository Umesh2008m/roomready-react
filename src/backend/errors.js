// Every refusal has the MERN backend's one problem shape: type, title, status, detail, plus the fields that refusal
// names (its "extras"). The services throw these; routes.js turns them into the answer.

export class Refusal extends Error {
  constructor(status, type, title, detail, extras = {}) {
    super(detail);
    this.status = status;
    this.type = type;
    this.title = title;
    this.extras = extras;
  }
}

/** A request part that is not valid: 400, naming each bad field. */
export const validation = (errors) => new Refusal(400, '/errors/validation', 'Invalid request', 'The request is not valid', { errors });

export const noSuchProperty = (property) => new Refusal(404, '/errors/no-such-property', 'No such property', `There is no property ${property}`);

export const noSuchRoom = (no) => new Refusal(404, '/errors/no-such-room', 'No such room', `There is no room ${no} in this property`);

export const roomNotOccupied = (no) => new Refusal(400, '/errors/room-not-occupied', 'Room not occupied', `Room ${no} has no guest to check out`);

export const noSuchHousekeeper = (id) => new Refusal(404, '/errors/no-such-housekeeper', 'No such housekeeper', `There is no housekeeper ${id}`);

export const noSuchAssignment = (id) => new Refusal(404, '/errors/no-such-assignment', 'No such assignment', `There is no assignment ${id}`);

/** The room is not where this step needs it: `state` says where it is, `needs` what must happen first. */
export const stepSkipped = (state, needs) => new Refusal(409, '/errors/step-skipped', 'Step skipped',
  `The room is ${state}; first it needs: ${needs}`, { state, needs });

export const alreadyAssigned = (assignedTo) => new Refusal(409, '/errors/already-assigned', 'Already assigned',
  `The room already has an open assignment (${assignedTo})`, { assignedTo });

export const selfInspection = () => new Refusal(409, '/errors/self-inspection', 'Self-inspection',
  'The inspector cleaned this room; somebody else must inspect it');
