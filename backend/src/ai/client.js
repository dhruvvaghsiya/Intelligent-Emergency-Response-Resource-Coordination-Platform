// §13.6 AI service contract — internal client with 2s timeout, 1 retry, circuit breaker
// (5 failures/30s -> open for 60s), every response carries `degraded`. services/ai is owned by
// a different team and is NOT part of this backend-only build; every call below therefore has a
// fully-functional deterministic fallback so the pipeline never blocks on it (§16.4).

import axios from 'axios';
import { env } from '../config/env.js';
import { AiCall } from '../models/AiCall.js';
import { newId } from '../utils/ids.js';
import { logger } from '../platform/logger.js';
import { keywordClassify, regexExtractAttributes, hashingEmbedding, templatedBriefing } from './fallback.js';

const http = axios.create({ baseURL: env.AI_SERVICE_URL, timeout: env.AI_TIMEOUT_MS });

const breaker = {
  failures: 0,
  openedUntil: 0,
  FAILURE_THRESHOLD: 5,
  WINDOW_MS: 30_000,
  OPEN_MS: 60_000,
  windowStart: 0,
};

function breakerIsOpen() {
  return Date.now() < breaker.openedUntil;
}

function recordFailure() {
  const now = Date.now();
  if (now - breaker.windowStart > breaker.WINDOW_MS) {
    breaker.windowStart = now;
    breaker.failures = 0;
  }
  breaker.failures += 1;
  if (breaker.failures >= breaker.FAILURE_THRESHOLD) {
    breaker.openedUntil = now + breaker.OPEN_MS;
    logger.warn('AI circuit breaker OPEN for %dms', breaker.OPEN_MS);
  }
}

function recordSuccess() {
  breaker.failures = 0;
}

async function callAi(endpoint, body) {
  if (breakerIsOpen()) throw new Error('CIRCUIT_OPEN');
  const start = Date.now();
  try {
    const res = await http.post(endpoint, body);
    recordSuccess();
    await logAiCall(endpoint, Date.now() - start, true, res.data?.degraded, false, res.data?.model);
    return res.data;
  } catch (err) {
    try {
      const res = await http.post(endpoint, body); // 1 retry
      recordSuccess();
      await logAiCall(endpoint, Date.now() - start, true, res.data?.degraded, false, res.data?.model);
      return res.data;
    } catch (err2) {
      recordFailure();
      await logAiCall(endpoint, Date.now() - start, false, true, false, null);
      throw err2;
    }
  }
}

async function logAiCall(endpoint, latency_ms, ok, degraded, schema_failed, model) {
  try {
    await AiCall.create({ _id: newId('aicall'), endpoint, latency_ms, ok, degraded: Boolean(degraded), schema_failed, model });
  } catch (err) {
    logger.debug({ err }, 'ai_calls log write failed');
  }
}

/** §13.6 POST /ai/v1/extract with keyword+regex fallback. */
export async function extract({ report_id, text, language, structured, location, occurred_at }) {
  try {
    const data = await callAi('/ai/v1/extract', { report_id, text, language, structured, location, occurred_at });
    return data;
  } catch {
    const cls = keywordClassify(text);
    const attributes = regexExtractAttributes(text);
    const embedding = hashingEmbedding(text);
    return {
      type_suggestion: cls.type,
      type_confidence: cls.confidence,
      attributes,
      entities: [],
      people_count_estimate: null,
      summary: (text || '').slice(0, 140),
      language_detected: language === 'auto' ? 'en' : language,
      embedding,
      degraded: true,
    };
  }
}

export async function embed(texts) {
  try {
    const data = await callAi('/ai/v1/embed', { texts });
    return data.vectors;
  } catch {
    return texts.map((t) => hashingEmbedding(t));
  }
}

export async function classify({ text, structured }) {
  try {
    return await callAi('/ai/v1/classify', { text, structured });
  } catch {
    const cls = keywordClassify(text);
    return { ...cls, degraded: true };
  }
}

export async function briefing(incident) {
  try {
    return await callAi('/ai/v1/briefing', { incident });
  } catch {
    return templatedBriefing(incident);
  }
}

export function aiHealthSnapshot() {
  return {
    circuit_breaker: breakerIsOpen() ? 'OPEN' : 'CLOSED',
    consecutive_failures: breaker.failures,
    opened_until: breaker.openedUntil ? new Date(breaker.openedUntil).toISOString() : null,
    ai_service_url: env.AI_SERVICE_URL,
  };
}
