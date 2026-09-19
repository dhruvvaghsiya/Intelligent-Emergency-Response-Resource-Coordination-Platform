# Prahari — Backend (`apps/api`)

This is a **backend-only** implementation of the Prahari platform described in the root
[`README.md`](../../README.md). Frontend and the Python AI service are owned by other teams and
are intentionally not touched here.

## Deliberate deviations from the root README

The root spec calls for Fastify + PostgreSQL/PostGIS/pgvector + Prisma. Per explicit instruction,
this build instead uses:

| Root spec | This build | Notes |
|---|---|---|
| Fastify | **Express** | Same routing/middleware shape, same contract |
| PostgreSQL + PostGIS + pgvector | **MongoDB + Mongoose** | `2dsphere` geo indexes replace PostGIS; semantic similarity uses an in-app cosine similarity over stored embedding arrays instead of a pgvector HNSW index (fine at hackathon scale — a few thousand documents) |
| Prisma migrations | Mongoose schemas | |
| `pg_advisory_xact_lock` | A short-lived unique `Lock` document (`platform/lock.js`) | Same effect: serialises concurrent writes for the same spatiotemporal block |
| Postgres `FOR UPDATE SKIP LOCKED` job queue | Atomic `findOneAndUpdate` claim per job (`platform/jobs.js`) | Same semantics, no separate lock table needed |
| Multi-document Postgres transaction for dispatch approval | `platform/transactions.js`: uses a real Mongo transaction when a replica set is available, otherwise an atomic per-document compare-and-swap + compensating rollback | The **partial unique index** on `assignments` is the real guarantee either way — see §15.2 in the root README |
| `packages/contracts`, `packages/core-logic` as separate workspaces | `src/contracts/*`, `src/core-logic/*` inside this app | This is a single-app backend build, not the full pnpm monorepo |
| `apps/sim` as a separate external client | `src/modules/admin/scenarios.js` — an in-process scenario runner that reuses the exact same report-ingest path | Frontend/AI apps don't exist in this build, so a fully separate simulator process wasn't warranted; behaviour is identical to what an external client posting to `POST /reports` would produce |

Everything else — the API surface, the enums, the evidence/belief model, the severity engine, the
correlation engine, the dispatch/Hungarian solver, RBAC, the event-sourced realtime layer — follows
the root README's contracts as closely as the database swap allows.

## Scope cuts (honest, declared — see root README §35 priorities)

Implemented in full: **P0** — auth/RBAC, ingest + 11-step pipeline + job worker, incident
lifecycle/state machine, correlation & duplicate detection with explanation + reversible
merge/unmerge, evidence ledger + belief fusion + CONTESTED handling, deterministic severity engine
+ hard rules + counterfactuals, unit registry + manual/automatic assignment, transactional
dispatch with double-assignment prevention, Socket.IO realtime + `/sync` gap recovery, seed data
with a pre-built CONTESTED incident, AI client with full deterministic fallbacks, audit log,
`db:reset`.

Implemented at **P1**: dispatch recommendation with cost breakdown, alerts + ack, incident
timeline, hospital ranking, AI health endpoint, analytics, rate limiting + idempotency,
prompt-injection-resistant extraction wrapper (delimiter + closed vocabulary — enforced on the
fallback path since no LLM is wired up in this build).

Implemented at reduced **P2** fidelity (declared, not hidden): Coverage Radar (grid + holes +
repositioning, no live traffic), Reallocation Advisor (regret model + 3 strategies, simplified
constants), cascade effects (one starter rule, not the full flood/plume rule library), replay
(event range query — no scrubber UI, that's frontend), Hungarian-vs-greedy comparison endpoint.

Not built (state, don't fake): field PWA offline queue is a server-side `/field/sync` stub only
(no client); full road-network routing (ETA uses the honest haversine × detour-factor fallback
everywhere, `eta_method: HAVERSINE_FALLBACK`); CHAOS toggles (kill the AI service manually via
`AI_SERVICE_URL` to see the same effect); real SMS/push.

## Quickstart

```bash
npm install
cp .env.example .env        # point MONGODB_URI at your MongoDB instance
npm run db:reset            # drops + reseeds: users, stations, units, hospitals, 3 demo incidents
npm run dev                 # :4000
```

Seeded users (password `prahari123` for all): `commander@prahari.in`, `dispatch@prahari.in`,
`analyst@prahari.in`, `unit07@prahari.in`, `admin@prahari.in`.

```bash
curl -X POST localhost:4000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"dispatch@prahari.in","password":"prahari123"}'
```

The seed includes one pre-built `CONTESTED` incident (`INC-...-0002`, industrial fire, Vatva) for
demoing evidence-conflict handling immediately without waiting on ingest.

## Project layout

```
src/
  contracts/     enums.js, tuning.js, schemas.js — the frozen vocabulary + tunable constants
  core-logic/     belief.js, severity.js, correlation.js, hungarian.js, eta.js — pure functions, no IO
  platform/       db, events (event_log/outbox), realtime (Socket.IO), jobs, rbac, errors,
                  idempotency, audit, lock, transactions
  ai/             client.js (circuit breaker) + fallback.js (keyword classifier, regex attributes,
                  hashing embedding) — every AI path has a working fallback
  models/         Mongoose schemas
  modules/        one folder per domain module (auth, ingest, pipeline, incidents, evidence,
                  severity, correlation, resources, dispatch, coverage, cascade, alerts, sync,
                  analytics, replay, admin, notify) — routes.js + service.js per module
  seed/           seed.js — idempotent, `--reset` flag drops collections first
```

## Environment variables

See `.env.example`. `AI_SERVICE_URL` points at the (not-built-here) `services/ai` — every call
degrades gracefully if it's unreachable, so the backend is fully functional standalone.
