// §29.2/29.3 demo scenarios — reduced set for a backend-only build. `apps/sim` as a fully
// separate external client is out of scope here (frontend/AI are owned by other teams); this
// runner reuses the exact same ingest path (`POST /reports` semantics via the report service +
// job queue) that a real external simulator would call, so behaviour is identical. Every entity
// it creates is flagged `is_simulated: true` with a `sim_run_id` (§29.1).

export const SCENARIOS = {
  flood_sabarmati: {
    name: 'flood_sabarmati',
    description: '14 reports over 4 min from 6 locations compress to ~2 incidents; water depth belief crosses threshold.',
    events: [
      { t: 0, source_type: 'CITIZEN_APP', text: 'Water rising fast near Sabarmati Riverfront, knee deep already', location: { lng: 72.5797, lat: 23.0225 } },
      { t: 15, source_type: 'EMERGENCY_CALL', text: 'Flooding near riverfront, road blocked, water depth increasing', location: { lng: 72.5801, lat: 23.0229 } },
      { t: 40, source_type: 'CITIZEN_SMS', text: 'Waterlogging riverfront area, waist deep water reported', location: { lng: 72.5793, lat: 23.0221 } },
      { t: 70, source_type: 'GOV_DEPARTMENT', text: 'Confirmed flood at Sabarmati riverfront, water depth high, road blocked', location: { lng: 72.5799, lat: 23.0227 } },
      { t: 110, source_type: 'FIELD_UNIT', text: 'On scene: riverfront flooding confirmed, access restricted, deploying water rescue', location: { lng: 72.5798, lat: 23.0226 } },
      { t: 160, source_type: 'CITIZEN_APP', text: 'Separate waterlogging near Maninagar underpass, cars stuck', location: { lng: 72.6100, lat: 22.9950 } },
    ],
  },
  industrial_fire_vatva: {
    name: 'industrial_fire_vatva',
    description: 'Citizen reports trapped workers (CRITICAL); sensor conflicts with low heat; field officer confirms.',
    events: [
      { t: 0, source_type: 'EMERGENCY_CALL', text: 'Huge fire at the chemical unit in Vatva, thick black smoke, workers trapped inside', location: { lng: 72.6281, lat: 22.9872 } },
      { t: 25, source_type: 'CITIZEN_APP', text: 'Fire at Vatva industrial unit, chemical hazard, heavy smoke visible', location: { lng: 72.6285, lat: 22.9875 } },
      { t: 40, source_type: 'IOT_SENSOR', text: 'Heat sensor HS-22 nearby reading normal temperature', structured: { sensor_id: 'HS-22', metric: 'temperature_c', value: 38.4 }, location: { lng: 72.6288, lat: 22.9869 } },
      { t: 95, source_type: 'FIELD_UNIT', text: 'Confirmed active fire, 2 workers unaccounted for, chemical drums on site, structural damage visible', location: { lng: 72.6282, lat: 22.9873 } },
    ],
  },
};

export function buildReportBody(scenarioEvent, simRunId) {
  return {
    source_type: scenarioEvent.source_type,
    source_label: `Simulator (${scenarioEvent.source_type})`,
    reporter_ref: null,
    text: scenarioEvent.text || '',
    language: 'auto',
    location: scenarioEvent.location,
    location_accuracy_m: 50,
    occurred_at: new Date().toISOString(),
    structured: scenarioEvent.structured || null,
    is_simulated: true,
    sim_run_id: simRunId,
  };
}
