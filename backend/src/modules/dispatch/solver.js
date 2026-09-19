// §22 RESOURCE ALLOCATION — cost function, Hungarian solve, and the §22.6 regret-based
// reallocation algorithm. Every number is expressed in seconds-equivalent (§22.2) so a plan's
// total_cost is directly readable by an operator.

import { TUNING } from '../../contracts/tuning.js';
import { hungarian, greedyAssignment } from '../../core-logic/hungarian.js';
import { estimateEta } from '../../core-logic/eta.js';
import { toWirePoint } from '../../utils/geo.js';

const SEVERITY_WEIGHT = { CRITICAL: 1.0, HIGH: 0.7, MODERATE: 0.4, LOW: 0.2, INFO: 0.05 };
const PROGRESS_BY_STATUS = { PROPOSED: 0, APPROVED: 0, EN_ROUTE: 0.3, ON_SCENE: 0.8 };
const REGRET_TIME_SCALE_S = 600; // declared design-time constant: "value" of one unit-incident, in seconds-equivalent
const RETASKING_PENALTY_S = 180;

export function capabilityGapPenalty(unit, requiredCapability) {
  const cfg = TUNING.dispatchCost;
  return unit.capabilities.includes(requiredCapability) ? 0 : cfg.beta_capability_gap_s;
}

export function specialisationBonus(unit, incidentType) {
  const cfg = TUNING.dispatchCost;
  const FAMILY_UNIT = {
    FIRE: ['FIRE_ENGINE', 'FIRE_LADDER'],
    MEDICAL: ['AMBULANCE_BLS', 'AMBULANCE_ALS'],
    HAZMAT: ['HAZMAT'],
    WATER: ['WATER_RESCUE'],
    STRUCTURAL: ['RESCUE_TECHNICAL'],
    TRAFFIC: ['AMBULANCE_BLS', 'AMBULANCE_ALS', 'POLICE_PATROL'],
    PUBLIC_ORDER: ['POLICE_PATROL'],
  };
  const family = TUNING.correlation.typeFamilies[incidentType];
  return (FAMILY_UNIT[family] || []).includes(unit.type) ? cfg.epsilon_specialisation_bonus_s : 0;
}

export function workloadPenalty(activeTaskCount) {
  return activeTaskCount * TUNING.dispatchCost.gamma_workload_s;
}

/** §7 W4 regret formula — the seconds-equivalent harm of removing `unit` from its current task. */
export function preemptionRegret({ unit, fromIncident, fromAssignment, toIncident, toIncidentAssignedCount, toIncidentUnitsRequired, etaToNewSeconds }) {
  if (!fromIncident) return 0; // unit was free — no regret

  const T_c_new = TUNING.severity.urgencyDecayByType[toIncident.type] ?? TUNING.severity.urgencyDecayByType.DEFAULT;
  const marginalValueNew = Math.max(0.1, 1 - (toIncidentAssignedCount / Math.max(1, toIncidentUnitsRequired)));
  const harmAvoided = SEVERITY_WEIGHT[toIncident.severity] * Math.exp(-etaToNewSeconds / T_c_new) * marginalValueNew * REGRET_TIME_SCALE_S;

  const progress = PROGRESS_BY_STATUS[fromAssignment?.status] ?? 0;
  const marginalValueOld = Math.max(0.1, 1 - ((fromIncident._assignedCount ?? 1) / Math.max(1, fromIncident.units_required)));
  const harmLost = SEVERITY_WEIGHT[fromIncident.severity] * marginalValueOld * (1 - progress) * REGRET_TIME_SCALE_S + RETASKING_PENALTY_S;

  return Math.max(0, harmLost - harmAvoided);
}

/**
 * Build a square cost matrix for Hungarian solving.
 * rows = required capability slots, cols = candidate units (+ dummy padding at infeasiblePenalty).
 */
export function buildCostMatrix({ requiredCapabilitiesFlat, candidates, incident, strategyDeltaMultiplier }) {
  const cfg = TUNING.dispatchCost;
  const n = Math.max(requiredCapabilitiesFlat.length, candidates.length);
  const matrix = [];
  const cellMeta = [];

  for (let row = 0; row < n; row++) {
    const requiredCapability = requiredCapabilitiesFlat[row] || null;
    const costRow = [];
    const metaRow = [];
    for (let col = 0; col < n; col++) {
      const cand = candidates[col];
      if (!requiredCapability || !cand) {
        costRow.push(cfg.infeasiblePenalty);
        metaRow.push(null);
        continue;
      }
      const eta = estimateEta(toWirePoint(cand.unit.location), toWirePoint(incident.location), { priority: true });
      const capGap = capabilityGapPenalty(cand.unit, requiredCapability);
      const workload = workloadPenalty(cand.activeTaskCount);
      const bonus = specialisationBonus(cand.unit, incident.type);
      const regret = strategyDeltaMultiplier * cand.regret;

      const cost = cfg.alpha_eta * eta.eta_seconds + capGap + workload + cfg.delta_preemption_regret * regret - bonus;

      costRow.push(cost);
      metaRow.push({ eta, capGap, workload, regret, bonus, requiredCapability });
    }
    matrix.push(costRow);
    cellMeta.push(metaRow);
  }
  return { matrix, cellMeta, n };
}

export function solve(matrix) {
  return hungarian(matrix);
}

export function solveGreedyBaseline(matrix) {
  return greedyAssignment(matrix);
}
