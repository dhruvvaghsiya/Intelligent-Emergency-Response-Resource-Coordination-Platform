# 🚨 Resilio — Intelligent Emergency Response & Resource Coordination Platform

> Turns a flood of noisy, duplicated, conflicting emergency reports into **one trusted operating picture**, then tells commanders **which unit to send where, and why**.

🌐 **Live demo:** https://resilio-one-blue.vercel.app/ops  ·  Built for Ahmedabad, city-agnostic (swap the map bounding box)

---

## The problem

In a flood, fire or industrial accident, information arrives from 108 calls, citizen apps, SMS, sensors, CCTV, field teams, hospitals and government feeds. One event is reported many times, sources disagree, and each ambulance or fire engine can only be committed once. The bottleneck isn't lack of information; it's **too much of it, with no way to tell what's true or what to do.**

Resilio treats this as an **inference + optimization** problem, not a CRUD dashboard.

## What makes it different

| | |
|---|---|
| 🧮 **Bayesian evidence fusion** | Conflicting reports are combined with source reliability and time decay, not "latest message wins". |
| 🎙️ **Voice-to-Report AI** | Real-time voice recording & transcription transforms spoken emergency narrations into structured, geo-tagged incident reports instantly. |
| 🔍 **Explainable severity** | A 7-factor weighted score with hard safety rules (escalate-only) and counterfactuals. No black box. |
| 🚒 **Optimal dispatch** | Hungarian (Kuhn–Munkres) assignment with preemption-regret and 3 strategies, not "nearest unit". |
| 🧩 **Duplicate detection** | 2-stage geo-blocking + 6-feature score, race-proof and reversible. |
| 🔮 **Foresight** | Cascade prediction, an 8-minute Coverage Radar, and a live escalation monitor. |
| 🛡️ **Never blocked by AI** | 2 s timeout, circuit breaker, and a full fallback chain. A report is never lost. |
| 🎞️ **Event-sourced realtime** | Every change is an immutable event, giving live updates, gap recovery and full incident **replay**. |
| ✅ **Honest engineering** | Every simplification is labelled in code, and benchmarks below are re-runnable. |

## Requirements coverage

| Required capability | Where it lives |
|---|---|
| Multi-source incident collection | 11 source types → single ingest door (`backend/src/modules/ingest`) |
| Voice-to-Report & Audio Ingest | Web Speech recognition + multi-attribute emergency intent parser (`frontend/src/pages/ReportPage.jsx`) |
| Classification, severity, priority | AI extraction + deterministic severity engine (`core-logic/severity.js`) |
| Duplicate detection | `core-logic/correlation.js`, `modules/correlation` |
| Resource recommendation (teams, vehicles, equipment, facilities) | `modules/dispatch` (units + capabilities), hospital ranking |
| Real-time monitoring | Socket.IO + MapLibre dashboard, 8 pages |
| Alerts and escalation | `modules/alerts`, `modules/monitor` (14 alert types) |
| AI assistance | Evidence-linked explanations, counterfactuals, LLM briefing endpoint |
| Analytics | `modules/analytics` (dedup ratio, p50/p90 response, utilization, shortages) |
| Notifications | Live push to per-incident, per-unit and global rooms |

---

## Architecture

```
 Sources ─►  POST /reports  ─►  Job queue  ─►  11-step pipeline  ─►  EventLog + Outbox  ─►  Socket.IO  ─►  React command center
 (11 types)   202 Accepted     (retry/backoff)   (per-step fault      (immutable events)    (rooms)         (map, queue, dispatch)
                                                  isolation)
                                     │
                                     └──► AI sidecar (FastAPI): extract · embed · classify · correlate · cascade · briefing · eval
                                          2 s timeout · 1 retry · circuit breaker · offline mock mode
```

**The pipeline** (`modules/pipeline/orchestrator.js`): Ingest → Persist and enqueue → Normalize → **Extract** (AI) → **Correlate** → Attach or create incident → **Fuse** beliefs → **Score** severity → Derive requirements → **Cascade** effects → Recommend *(on demand, never stale)* → Emit.

Each step is independently retryable and degrades on its own. If extraction, correlation or cascade fails, the incident is still created and flagged `degraded`.

---

## Core algorithms

### 1. Bayesian evidence fusion — `core-logic/belief.js`
```
w      = source_reliability × extraction_confidence × e^(−age / τ)
Belief = sigmoid( Σ w · logit(p) )          # p clamped to [0.02, 0.98]
State  = SUPPORTED (≥.6) | REFUTED (≤.4) | UNKNOWN | CONTESTED (supporting AND refuting weight both ≥ 0.8)
```
11 source priors (Field unit **0.93** · Gov/Hospital 0.88 · IoT 0.82 · CCTV 0.72 · Emergency call 0.62 · Citizen app 0.55 · SMS 0.50 · Social **0.35**) and per-attribute decay τ (fire 10 min, flood depth 30 min). Conflict is **flagged, never averaged away**.

### 2. Explainable severity — `core-logic/severity.js`
`score = clamp(0–100, Σ weight × factor × 100)`

| Life risk | Hazard class | Spread | Exposure | Infrastructure | Time sensitivity | Access |
|---|---|---|---|---|---|---|
| 0.30 | 0.16 | 0.14 | 0.12 | 0.10 | 0.10 | 0.08 |

Bands: **CRITICAL ≥ 80 · HIGH ≥ 60 · MODERATE ≥ 35 · LOW ≥ 15**.
- **Hard rules can only escalate:** trapped people (P > 0.6) → CRITICAL; fatalities → ≥ HIGH; chemical hazard + high exposure → CRITICAL; 3+ independent life-risk sources → ≥ HIGH.
- **Counterfactuals:** the top 3 drivers are flipped to show impact ("if `people_trapped` were false → MODERATE").
- **Contested evidence** holds the *pessimistic* score and shows both bounds. Operator overrides are sticky and audit-logged.

### 3. Duplicate detection — `core-logic/correlation.js`
- **Stage 1 blocking** (Mongo `$geoNear`): type-family radius and window (e.g. fire 400 m/45 min, road accident 150 m/20 min, flood 1.5 km/3 h), max 25 candidates.
- **Stage 2 scoring:** `score = sigmoid(4·Σ w·f)` over six features: distance (.26), MiniLM semantic similarity (.24), time (.18), type match (.12), entity overlap with landmark ×2 (.12), same-reporter penalty (−.08).
- **Bands:** DUPLICATE ≥ .86 (auto-attach) · LIKELY_SAME ≥ .68 (alert) · RELATED ≥ .45 (link).
- **No embeddings?** Weights renormalize and thresholds shift +0.05.
- **Race-proof:** a per-block lock (type family + ~550 m grid + 5-min bucket) stops simultaneous reports creating twin incidents.
- **Reversible:** merge and unmerge use a journal snapshot. Every link carries a plain-text explanation.

### 4. Optimal dispatch — `core-logic/hungarian.js`, `modules/dispatch`
- **Requirement matrix:** e.g. a critical structure fire with trapped people → 2× fire suppression + extrication + advanced medical + command (5 units).
- **Cost matrix** (seconds-equivalent, so operators can read it): `ETA + 240 s capability gap + 90 s × workload + preemption regret − 60 s specialisation bonus`, solved with **O(n³) Kuhn–Munkres**.
- **Preemption regret** = harm lost − harm avoided. It lets the system justify pulling a unit off a lower-priority incident. **Guardrails:** never pull a unit on scene at a CRITICAL incident, and never leave a life-risk incident with zero units.
- **3 ranked plans** when preemption is needed: Minimal Disruption · Fastest Response · Balanced. Plans expire after 90 s.
- **Hospital ranking:** travel time + bed-availability penalty, with a hard ICU filter for CRITICAL cases.
- **Safe approval:** version compare-and-swap + a DB partial unique index (`one_active_assignment_per_unit`) + idempotency keys. A unit can never be double-booked, and **a human approves every plan.**

### 5. Foresight — `modules/cascade`, `modules/coverage`, `modules/monitor`
- **Cascade rule graph:** 7 typed causal rules are defined (flood → road block, industrial fire → plume zone, gas exclusion zone, and more). *Live today:* flood → nearby road segments marked `BLOCKED` with a TTL, so routing avoids them. A prediction may exist only if it mutates real system state.
- **Coverage Radar:** ~1,400 cells (~600 m) over the city, population-weighted. A **hole** is a populated cell no unit can reach within **8 minutes**, and the system suggests which idle unit to reposition.
- **Escalation monitor** (sweeps every 25 s): `SLA_BREACH` (no dispatch within 8 min for medical/rescue, 15 min otherwise) · `COVERAGE_HOLE` · `RESOURCE_SHORTAGE` (capability missing or hospital beds ≤ 2) · `UNIT_UNRESPONSIVE` (no ping for 3 min) · `AI_DEGRADED` (≥ 40% fallback). Alerts are de-duplicated by key.

### 6. AI layer and guardrails — `ai/`
- **Extraction:** an LLM (Gemini / OpenAI / Groq, or fully offline `mock`) turns report text into structured claims from a **closed vocabulary** (16 incident types, 14 evidence attributes, 6 entity types). English, Hindi, Gujarati and Hinglish are handled. Keyword rules run first as a prior, and 384-d MiniLM embeddings power similarity.
- **Guardrails:** report text is wrapped as `<untrusted_report>` (data, never instructions); unknown attributes are dropped; probabilities are clamped to [0.05, 0.95] so the AI can never assert certainty; output is HTML-escaped; one repair retry before fallback. The AI never sets a severity score or dispatch decision.
- **Fallback chain:** LLM → keyword rules and regex → hashing embedding.
- **Classifier:** a TF-IDF + LinearSVC model is served at `/ai/v1/classify` and benchmarked against the keyword baseline (see below).

### 7. Voice-to-Report synthesis — `frontend/src/pages/ReportPage.jsx`
- **Continuous Voice Streaming:** Real-time browser speech recognition captures live spoken emergency audio from callers, witnesses, or field personnel.
- **Multi-Attribute Intent Engine:** Spoken audio is analyzed across 14 incident categories (building collapse, chemical spill, structure fire, road collision, gas leak, medical emergency, flood/waterlogging, etc.) using weighted keyword and semantic intent scoring.
- **Zero-Touch Form Generation:** Automatically populates the entire incident report—classifying incident type, extracting situational description, assigning GPS coordinates, and contact details from voice alone without manual typing.
- **Resilient Fallback:** Includes interactive simulated audio presets for environments without microphone access.

---

## Reliability

| If this fails… | Resilio does this |
|---|---|
| AI / LLM down or slow | Rule fallback, incident still created and marked `degraded`, `AI_DEGRADED` alert |
| A pipeline job crashes | Exponential-backoff retry (5 attempts), then dead-letter |
| Live connection drops | Per-room sequence numbers, `GET /sync?since_seq` gap recovery, a STALE banner that disables actions |
| Double-click or network retry | Idempotency-Key replays the stored response (24 h) |
| Two dispatchers grab one unit | Version CAS + unique index → clean `RESOURCE_CONFLICT` |
| Simultaneous duplicate reports | Per-block lock |
| Field unit offline | Idempotent sync with a monotonic-status rule (a stale update can't move a unit backwards) |

Also: JWT auth, Helmet, Zod validation, rate limits, structured logs, a full audit trail, and 23 data models.

---

## Verified results

Measured on this repo's own code. Re-run them:

```bash
cd backend && node scripts/benchmarks.mjs      # dispatch + fusion (no database needed)
cd ai      && python scripts/heldout_eval.py   # held-out classification
cd ai      && python -m pytest tests -q        # 83 AI tests
```

| Test | Result |
|---|---|
| Hungarian vs brute-force optimum (2,000 random matrices) | **2,000 / 2,000 optimal** |
| Hungarian vs greedy (3,000 simulated dispatches, real cost function) | Better in **~50%** of cases, never worse, **4.7% lower total cost** (avg ~144 s-equivalent, up to 960 s) |
| Solve time | 300×300 assignment in **~10 ms** |
| Evidence fusion, contradicting sensor (illustrative scenario) | last-write-wins 0.05 · naive mean 0.60 · **fusion 0.39**, then **0.85** after a field officer confirms |
| Evidence decay (single field claim) | P = 0.90 → 0.69 at 10 min → 0.53 at 30 min |
| Incident-type classification, held-out (train on 330 synthetic rows, test on 120 hand-labelled) | SVM **78.3%** vs keyword rules 65.8% overall; **87%** vs 58% on standard reports; **90%** vs 55% on Hindi/Gujarati/Hinglish |
| Adversarial / injection-style text | Keyword rules 85% vs SVM 40% (the SVM has no "UNKNOWN" class), which is why the live path uses LLM + rules + guardrails |
| Automated tests | **83 AI tests pass** (incl. 10 prompt-injection tests) |

---

## The screens

**Ops** (live map, queue, evidence, severity and dispatch panels) · **Resources** (units and hospitals) · **Alerts** · **Analytics** (dedup ratio, p50/p90 response by type, fleet utilization, plan acceptance) · **AI Health** (circuit-breaker state, latency, fallback rate) · **Replay** (scrub any incident's event timeline) · **Report** (citizen portal with live voice recording, voice-to-report AI synthesis, and GPS geocoding) · **Field** (status updates and observations).

Anyone can **view** the live picture. Actions (approve dispatch, override severity, start demos) need the admin login.

**Live World Engine:** the demo city is always alive. Simulated IoT sensors, CCTV, social chatter and hospital drift run continuously, and a correlated 3–7 report incident cluster arrives every 90–240 s (intensity dial 0.25×–4×).

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Zustand, TanStack Query, MapLibre GL, Recharts, Socket.IO client, Tailwind v4 |
| Backend | Node 20, Express, MongoDB (2dsphere), Socket.IO, Zod, JWT, Pino. 59 REST endpoints, 21 event types |
| AI sidecar | FastAPI, sentence-transformers (MiniLM-L6-v2), scikit-learn, Gemini / OpenAI / Groq adapters |
| Core algorithms | Pure, dependency-free JS: fusion, severity, correlation, Hungarian, ETA |

---

## Run locally

Requires Node 20+, MongoDB (local or Atlas), and Python 3.11+ (optional, for the AI service).

```bash
# 1. Backend  →  http://localhost:4000
cd backend && cp .env.example .env && npm install
npm run seed && npm run dev

# 2. AI service (optional)  →  http://localhost:8000
cd ai && cp .env.example .env && pip install -r requirements.txt   # first install is large
uvicorn app.main:app --reload --port 8000

# 3. Frontend  →  http://localhost:3000
cd frontend && cp .env.example .env && npm install && npm run dev
```

No API key? Keep `LLM_PROVIDER=mock`; it runs fully offline on keyword rules. Skipping the AI service also works, since the backend has its own fallback.

**Demo admin login** (created by the seed step): `admin@prahari.in` / `prahari123`. Demo only; set a new `JWT_SECRET` and password for any real deployment. *(Prahari is the project's internal codename.)*

### Guided demo
Log in, open **Ops**, and start a scenario from the simulation panel:
- **Sabarmati flood:** many reports merge into one incident, and nearby roads are marked blocked.
- **Vatva chemical fire:** a sensor contradicts callers, the conflict is flagged, and severity holds CRITICAL until a field officer confirms.
- **Voice-to-Report generation:** open **Report**, click the microphone or trigger simulated voice sessions, speak an emergency description, and watch the platform transcribe and auto-generate the complete structured incident report in real time.

---

## Honest limits and roadmap

All data is simulated. Known simplifications, each labelled in code:

| Today | Next |
|---|---|
| ETA = straight-line × 1.4 detour at ~40 km/h (`HAVERSINE_FALLBACK`) | OpenStreetMap road-graph routing |
| ~600 m quantised coverage grid | H3 hexes with real census data |
| 1 live cascade rule (7 defined) | Wire all 7, plus weather-driven rules |
| Source priors and correlation weights are hand-set | Learn them from resolved incidents and operator merge/unmerge labels |
| Live in-app alerts | SMS / email / push notifications |
| One admin role + public read-only view | Full role-based access (permission matrix already in place) |

---

## Project layout

```
ai/         FastAPI AI sidecar: extraction, embeddings, classifier, correlation, guardrails, eval, tests
backend/    Node API: pipeline, dispatch, alerts, monitor, world engine; core-logic/ holds the pure algorithms
frontend/   React command center: map, dashboards, replay, citizen report and field pages
```

---

## Team

| Role | Member |
|---|---|
| **AI / ML** | Meet Gajera |
| **Backend** | Prins Shiyani |
| **Frontend** | Dhruv Vaghasiya, Meet Baldha |
