// Report-content generators for the Live World Engine. Base sentences are hand-written so they
// read like real reports AND naturally contain the keyword combinations
// `ai/config/type_keywords.yaml` looks for — so generated reports classify correctly even fully
// offline (LLM_PROVIDER=mock), same guarantee the hand-scripted scenarios in
// modules/admin/scenarios.js already rely on.

export const SOURCE_LABELS = {
  EMERGENCY_CALL: '108 Emergency Call Center',
  CITIZEN_APP: 'Citizen App (Android)',
  CITIZEN_SMS: 'Citizen SMS Gateway',
  SOCIAL_MEDIA: 'Social Media Monitor',
  IOT_SENSOR: 'IoT Sensor Network',
  CCTV_ANALYTICS: 'CCTV Analytics Engine',
  FIELD_UNIT: 'Field Unit Radio',
  HOSPITAL: 'Hospital ER Feed',
  GOV_DEPARTMENT: 'AMC Disaster Management Cell',
};

export function sourceLabel(sourceType) {
  return SOURCE_LABELS[sourceType] || sourceType;
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Terse-ify a sentence for SMS: drop articles, cap length. Not a real NLP transform — a
 * deliberately cheap stylistic approximation, good enough for a demo feed. */
function smsify(s) {
  const short = s.replace(/\b(a|an|the)\b\s+/gi, '').trim();
    return short.length > 140 ? `${short.slice(0, 137)}...` : short;
}

const TONE = {
  EMERGENCY_CALL: (s, place) => `Caller reports: "${s}" Location given as near ${place}.`,
  CITIZEN_APP: (s, place) => `${cap(s)} Reported from ${place} via app, photo attached.`,
  CITIZEN_SMS: (s, place) => smsify(`${s} AT ${place.toUpperCase()} PLZ SEND HELP`),
  SOCIAL_MEDIA: (s, place) => `Seeing reports of ${s.toLowerCase()} near ${place} right now — someone alert @AhmedabadCivic #emergency`,
  GOV_DEPARTMENT: (s, place) => `Advisory: ${cap(s)} confirmed in the ${place} sector. Public advised to avoid the area until further notice.`,
  FIELD_UNIT: (s, place) => `Unit on scene at ${place}: ${cap(s)}`,
  HOSPITAL: (s, place) => `ER inbound notice: casualties expected from an incident near ${place} — ${s}`,
};

export function buildReportText(profile, sourceType, { place, escalate = false } = {}) {
  const base = escalate && profile.escalations?.length
    ? `${profile.sentence(place)} ${profile.escalations[Math.floor(Math.random() * profile.escalations.length)]}`
    : profile.sentence(place);
  const wrap = TONE[sourceType];
  return wrap ? wrap(base, place) : `${base} (near ${place})`;
}

// One profile per INCIDENT_TYPE we actively generate. `sentence(place)` returns the base claim;
// `escalations` are appended on later/more-urgent reports in a director-driven burst to mirror a
// real situation worsening over a few minutes. `plausibleSources` restrict which SOURCE_TYPEs are
// realistic reporters for this kind of event. `sensor`/`cctv` (optional) drive structured payloads
// for IOT_SENSOR / CCTV_ANALYTICS reports of this type.
export const INCIDENT_PROFILES = {
  FIRE_STRUCTURE: {
    sentence: (p) => `fire breaking out at a residential building in ${p}, flames visible from the street`,
    escalations: ['Thick black smoke now covering the whole block.', 'Neighbours say people may still be trapped inside.'],
    plausibleSources: ['EMERGENCY_CALL', 'CITIZEN_APP', 'CITIZEN_SMS', 'SOCIAL_MEDIA', 'FIELD_UNIT', 'CCTV_ANALYTICS', 'HOSPITAL'],
    sensor: { metric: 'temperature_c', unit: 'C', normalRange: [24, 34], anomalyRange: [58, 92], prefix: 'HS' },
    cctv: { detection: 'smoke_detected' },
  },
  FIRE_INDUSTRIAL: {
    sentence: (p) => `fire at an industrial unit in ${p}, heavy smoke and possible chemical drums on site`,
    escalations: ['Workers reported trapped inside the plant.', 'Fire appears to be spreading toward adjacent units.'],
    plausibleSources: ['EMERGENCY_CALL', 'CITIZEN_APP', 'FIELD_UNIT', 'IOT_SENSOR', 'GOV_DEPARTMENT', 'HOSPITAL'],
    sensor: { metric: 'temperature_c', unit: 'C', normalRange: [30, 42], anomalyRange: [70, 140], prefix: 'HS' },
    cctv: { detection: 'smoke_detected' },
  },
  FIRE_VEHICLE: {
    sentence: (p) => `a vehicle on fire on the main road in ${p}, traffic backing up`,
    escalations: ['Flames spreading toward parked vehicles nearby.'],
    plausibleSources: ['EMERGENCY_CALL', 'CITIZEN_APP', 'CITIZEN_SMS', 'SOCIAL_MEDIA', 'FIELD_UNIT'],
  },
  FLOOD: {
    sentence: (p) => `water rising fast in ${p}, road already knee deep`,
    escalations: ['Water now waist deep, vehicles stalling.', 'Water depth increasing, residents moving to upper floors.'],
    plausibleSources: ['EMERGENCY_CALL', 'CITIZEN_APP', 'CITIZEN_SMS', 'SOCIAL_MEDIA', 'FIELD_UNIT', 'IOT_SENSOR', 'GOV_DEPARTMENT'],
    sensor: { metric: 'water_level_cm', unit: 'cm', normalRange: [8, 25], anomalyRange: [55, 140], prefix: 'WL' },
  },
  WATERLOGGING: {
    sentence: (p) => `waterlogging on the road in ${p}, cars stuck and traffic stopped`,
    escalations: ['Water accumulating faster than it can drain.'],
    plausibleSources: ['CITIZEN_APP', 'CITIZEN_SMS', 'SOCIAL_MEDIA', 'FIELD_UNIT', 'IOT_SENSOR'],
    sensor: { metric: 'water_level_cm', unit: 'cm', normalRange: [5, 15], anomalyRange: [25, 60], prefix: 'WL' },
  },
  ROAD_ACCIDENT: {
    sentence: (p) => `a multi-vehicle collision on the road in ${p}, at least one vehicle overturned`,
    escalations: ['Passengers reported injured and bleeding.', 'Road now completely blocked by wreckage.'],
    plausibleSources: ['EMERGENCY_CALL', 'CITIZEN_APP', 'CITIZEN_SMS', 'SOCIAL_MEDIA', 'FIELD_UNIT', 'CCTV_ANALYTICS', 'HOSPITAL'],
    cctv: { detection: 'stopped_traffic' },
  },
  MEDICAL_EMERGENCY: {
    sentence: (p) => `a medical emergency in ${p}, person unconscious and not breathing normally, ambulance needed`,
    escalations: ['Bystanders report the patient is now unresponsive.'],
    plausibleSources: ['EMERGENCY_CALL', 'CITIZEN_APP', 'CITIZEN_SMS', 'FIELD_UNIT', 'HOSPITAL'],
  },
  BUILDING_COLLAPSE: {
    sentence: (p) => `part of a building collapsed in ${p}, rubble blocking the lane`,
    escalations: ['Cries heard from under the rubble, people believed trapped.'],
    plausibleSources: ['EMERGENCY_CALL', 'CITIZEN_APP', 'SOCIAL_MEDIA', 'FIELD_UNIT', 'GOV_DEPARTMENT', 'HOSPITAL'],
  },
  GAS_LEAK: {
    sentence: (p) => `a strong gas leak smell reported near a cylinder shop in ${p}`,
    escalations: ['Hissing sound now audible, residents evacuating the building.'],
    plausibleSources: ['EMERGENCY_CALL', 'CITIZEN_APP', 'CITIZEN_SMS', 'FIELD_UNIT', 'IOT_SENSOR', 'GOV_DEPARTMENT'],
    sensor: { metric: 'gas_ppm', unit: 'ppm', normalRange: [2, 15], anomalyRange: [120, 400], prefix: 'GS' },
  },
  CHEMICAL_SPILL: {
    sentence: (p) => `a chemical spill at a plant in ${p}, toxic fumes reported in the area`,
    escalations: ['Fumes spreading toward nearby residential lanes.'],
    plausibleSources: ['EMERGENCY_CALL', 'FIELD_UNIT', 'IOT_SENSOR', 'GOV_DEPARTMENT', 'HOSPITAL'],
    sensor: { metric: 'gas_ppm', unit: 'ppm', normalRange: [3, 20], anomalyRange: [150, 500], prefix: 'GS' },
  },
  ELECTRICAL_HAZARD: {
    sentence: (p) => `a live power line down in ${p} after sparking near a transformer`,
    escalations: ['Sparking has intensified, small fire starting at the base of the pole.'],
    plausibleSources: ['EMERGENCY_CALL', 'CITIZEN_APP', 'CITIZEN_SMS', 'FIELD_UNIT', 'GOV_DEPARTMENT'],
  },
  CROWD_INCIDENT: {
    sentence: (p) => `a large crowd surge and panic reported at a gathering in ${p}`,
    escalations: ['People reported falling and being crushed near the exit gate.'],
    plausibleSources: ['EMERGENCY_CALL', 'CITIZEN_APP', 'SOCIAL_MEDIA', 'FIELD_UNIT', 'CCTV_ANALYTICS', 'HOSPITAL'],
    cctv: { detection: 'crowd_density_high' },
  },
  RESCUE_TRAPPED: {
    sentence: (p) => `people trapped and unable to get out after a structure gave way in ${p}`,
    escalations: ['Rescue teams say access to the trapped victims is difficult.'],
    plausibleSources: ['EMERGENCY_CALL', 'CITIZEN_APP', 'FIELD_UNIT', 'HOSPITAL'],
  },
  INFRASTRUCTURE_FAILURE: {
    sentence: (p) => `a water pipeline burst in ${p}, flooding the street and cutting supply to the area`,
    escalations: ['A sinkhole is now forming where the road surface gave way.'],
    plausibleSources: ['CITIZEN_APP', 'CITIZEN_SMS', 'SOCIAL_MEDIA', 'FIELD_UNIT', 'GOV_DEPARTMENT'],
  },
};

export const GENERATABLE_TYPES = Object.keys(INCIDENT_PROFILES);

export function randomReporterRef(sourceType) {
  if (!['CITIZEN_APP', 'CITIZEN_SMS', 'EMERGENCY_CALL'].includes(sourceType)) return null;
  return `hash_${Math.random().toString(36).slice(2, 10)}`;
}

export function sensorStructured(profile, anomalous) {
  if (!profile.sensor) return null;
  const { metric, unit, normalRange, anomalyRange, prefix } = profile.sensor;
  const range = anomalous ? anomalyRange : normalRange;
  const value = Math.round((range[0] + Math.random() * (range[1] - range[0])) * 10) / 10;
  return { sensor_id: `${prefix}-${100 + Math.floor(Math.random() * 60)}`, metric, value, unit };
}

export function cctvStructured(profile, anomalous) {
  if (!profile.cctv) return null;
  return {
    camera_id: `CAM-${100 + Math.floor(Math.random() * 40)}`,
    detection: anomalous ? profile.cctv.detection : 'normal',
    confidence: anomalous ? Math.round((0.7 + Math.random() * 0.28) * 100) / 100 : Math.round(Math.random() * 0.2 * 100) / 100,
  };
}
