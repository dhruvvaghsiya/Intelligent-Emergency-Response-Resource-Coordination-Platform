import { ulid } from 'ulid';

// §13. F2 — {prefix}_{ULID}, opaque to FE, monotonic by time.
export const ID_PREFIX = {
  user: 'usr', report: 'rep', incident: 'inc', evidence: 'evd', link: 'lnk',
  merge: 'mrg', station: 'stn', unit: 'unt', assignment: 'asg', plan: 'pln',
  hospital: 'hsp', road: 'rd', cell: 'cel', alert: 'alr', event: 'evt',
  outbox: 'obx', job: 'job', idem: 'idm', audit: 'aud', aicall: 'aic', sim: 'sim',
  location: 'loc',
};

export function newId(kind) {
  const prefix = ID_PREFIX[kind];
  if (!prefix) throw new Error(`Unknown id kind: ${kind}`);
  return `${prefix}_${ulid()}`;
}
