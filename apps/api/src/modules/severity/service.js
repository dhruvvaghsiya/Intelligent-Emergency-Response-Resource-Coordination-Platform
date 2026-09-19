// §20 SEVERITY ARCHITECTURE — deterministic weighted engine + hard rules + counterfactuals.
// Wraps packages/core-logic/severity.js with the IO (persistence, events, alerts) it must stay free of.

import { Incident } from '../../models/Incident.js';
import { Evidence } from '../../models/Evidence.js';
import { assessSeverity, SEVERITY_ORDER } from '../../core-logic/severity.js';
import { appendEvent } from '../../platform/events.js';
import { raiseAlert } from '../alerts/service.js';
import { toIncidentSummary } from '../incidents/service.js';
import { AppError } from '../../platform/errors.js';

async function independentLifeRiskSourceCount(incidentId) {
  const evidence = await Evidence.find({
    incident_id: incidentId, superseded: false,
    attribute: { $in: ['people_trapped', 'casualties_reported', 'fatalities_reported'] },
    asserted_probability: { $gte: 0.5 },
  });
  const distinctSources = new Set(evidence.map((e) => `${e.source_type}:${e.source_label}`));
  return distinctSources.size;
}

export async function recomputeSeverity(incidentId, actor = { kind: 'SYSTEM' }) {
  const incident = await Incident.findById(incidentId);
  if (!incident) throw new AppError('NOT_FOUND', 'Incident not found');

  const independentSources = await independentLifeRiskSourceCount(incidentId);
  const ctx = {
    type: incident.type,
    occurred_at: incident.occurred_at,
    now: new Date(),
    people_count_estimate: incident.people_count_estimate,
    population_weight: 0, // coverage grid not computed for this incident by default (§P2)
    near_critical_infra: false,
    best_eta_seconds: null,
  };

  const assessment = assessSeverity(incident.beliefs || {}, ctx, { independent_life_risk_sources: independentSources });

  const previousSeverity = incident.severity;
  const previousAssessment = incident.severity_assessment;
  const crossedBand = SEVERITY_ORDER.indexOf(assessment.severity) !== SEVERITY_ORDER.indexOf(previousSeverity);

  // preserve a manual override if one is active and still more severe/equal — overrides are
  // sticky until explicitly cleared (§20 Override)
  if (previousAssessment?.overridden_by) {
    assessment.overridden_by = previousAssessment.overridden_by;
  }

  incident.severity = assessment.overridden_by ? previousSeverity : assessment.severity;
  incident.severity_score = assessment.overridden_by ? incident.severity_score : assessment.score;
  incident.severity_assessment = assessment;
  incident.updated_at = new Date();
  await incident.save();

  await appendEvent({
    room: `incident:${incidentId}`, type: 'incident.severity_changed',
    entity: { kind: 'incident', id: incidentId }, actor, payload: { severity_assessment: assessment, incident: toIncidentSummary(incident) },
  });
  await appendEvent({
    room: 'ops:global', type: 'incident.severity_changed',
    entity: { kind: 'incident', id: incidentId }, actor, payload: toIncidentSummary(incident),
  });

  if (!assessment.overridden_by && crossedBand) {
    if (assessment.severity === 'CRITICAL' && previousSeverity !== 'CRITICAL') {
      await raiseAlert({
        type: 'NEW_CRITICAL', severity: 'CRITICAL', incident_id: incidentId,
        title: `${incident.code} escalated to CRITICAL`,
        body: `Severity score ${assessment.score}. ${assessment.confidence_note || ''}`.trim(),
        payload: { factors: assessment.factors },
      });
    } else {
      await raiseAlert({
        type: 'SEVERITY_ESCALATED', severity: assessment.severity, incident_id: incidentId,
        title: `${incident.code} severity changed: ${previousSeverity} -> ${assessment.severity}`,
        body: `Score ${assessment.score}.`,
        payload: { from: previousSeverity, to: assessment.severity, factors: assessment.factors },
      });
    }
  }

  return assessment;
}

export async function overrideSeverity(incidentId, { severity, reason, userId, userName }) {
  const incident = await Incident.findById(incidentId);
  if (!incident) throw new AppError('NOT_FOUND', 'Incident not found');

  const systemAssessment = incident.severity_assessment;
  incident.severity_assessment = {
    ...systemAssessment,
    overridden_by: { user_id: userId, name: userName, reason, at: new Date().toISOString() },
  };
  incident.severity = severity;
  incident.version += 1;
  incident.updated_at = new Date();
  await incident.save();

  await appendEvent({
    room: `incident:${incidentId}`, type: 'incident.severity_changed',
    entity: { kind: 'incident', id: incidentId }, actor: { kind: 'USER', id: userId, name: userName },
    payload: { severity_assessment: incident.severity_assessment, incident: toIncidentSummary(incident) },
  });

  return incident.severity_assessment;
}
