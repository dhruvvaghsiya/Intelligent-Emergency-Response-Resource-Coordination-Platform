// §22.1 requirement derivation — (type, severity, beliefs) -> required_capabilities[] + units_required.
// A frozen matrix, evaluated top-to-bottom, first matching rule wins (more specific rules first).

import { TUNING } from '../../contracts/tuning.js';
import { b as belief } from '../../core-logic/belief.js';

function ruleMatches(rule, { type, severity, beliefs }) {
  const w = rule.when;
  if (w.type && w.type !== type) return false;
  if (w.severity && w.severity !== severity) return false;
  if (w.attribute && !(belief(beliefs, w.attribute) > (w.gt ?? 0.5))) return false;
  return true;
}

export function deriveRequirements(type, severity, beliefs) {
  const rules = TUNING.requirements.rules;
  const specific = rules.filter((r) => r.when.severity || r.when.attribute);
  const general = rules.filter((r) => !r.when.severity && !r.when.attribute);

  const matched = [...specific, ...general].find((r) => ruleMatches(r, { type, severity, beliefs }));
  const rule = matched || TUNING.requirements.default;

  const capabilities = (rule.capabilities || []).flatMap((c) => Array(c.count).fill(c.capability));
  return {
    capabilities_flat: capabilities, // one entry per required slot — matches solver row count
    capabilities_unique: [...new Set(capabilities)],
    units_required: rule.units_required ?? capabilities.length ?? 1,
  };
}
