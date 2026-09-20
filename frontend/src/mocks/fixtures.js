/* =========================================================================
   MOCK DATA / FIXTURES — Based on §13.8 canonical fixtures
   Ahmedabad AOI, bbox [72.45, 22.95, 72.72, 23.13]
   ========================================================================= */

const now = new Date().toISOString();
const minutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString();

// ——— USERS — single-role system, one account type (Admin) ———
export const MOCK_USERS = [
  { id: 'usr_admin', email: 'admin@prahari.in', name: 'System Admin', role: 'ADMIN', station_id: 'stn_001' },
];

// ——— STATIONS ———
export const MOCK_STATIONS = [
  { id: 'stn_001', name: 'Central Command — Lal Darwaja',   location: { lng: 72.5714, lat: 23.0258 } },
  { id: 'stn_002', name: 'Fire Station — Navrangpura',      location: { lng: 72.5572, lat: 23.0369 } },
  { id: 'stn_003', name: 'Fire Station — Maninagar',        location: { lng: 72.5977, lat: 23.0012 } },
  { id: 'stn_004', name: 'Fire Station — Vatva',            location: { lng: 72.6281, lat: 22.9872 } },
  { id: 'stn_005', name: 'EMS Hub — Ellis Bridge',          location: { lng: 72.5621, lat: 23.0325 } },
  { id: 'stn_006', name: 'Police Station — SG Highway',     location: { lng: 72.5100, lat: 23.0350 } },
];

// ——— UNITS (14 total: 4 ambulance, 3 fire, 1 ladder, 1 hazmat, 2 rescue, 2 police, 1 water) ———
export const MOCK_UNITS = [
  { id: 'unt_001', call_sign: 'A-01', type: 'AMBULANCE_BLS', capabilities: ['MEDICAL_BASIC'], status: 'AVAILABLE', station_id: 'stn_005', location: { lng: 72.5621, lat: 23.0325 }, heading: 45, last_location_at: minutesAgo(1), crew_size: 2, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_002', call_sign: 'A-02', type: 'AMBULANCE_BLS', capabilities: ['MEDICAL_BASIC'], status: 'EN_ROUTE', station_id: 'stn_005', location: { lng: 72.5750, lat: 23.0180 }, heading: 120, last_location_at: minutesAgo(0), crew_size: 2, current_assignment_id: 'asg_001', version: 3, is_simulated: true },
  { id: 'unt_003', call_sign: 'A-03', type: 'AMBULANCE_BLS', capabilities: ['MEDICAL_BASIC'], status: 'ON_SCENE', station_id: 'stn_003', location: { lng: 72.5990, lat: 23.0045 }, heading: 0, last_location_at: minutesAgo(2), crew_size: 2, current_assignment_id: 'asg_003', version: 5, is_simulated: true },
  { id: 'unt_004', call_sign: 'A-07', type: 'AMBULANCE_ALS', capabilities: ['MEDICAL_BASIC', 'MEDICAL_ADVANCED'], status: 'AVAILABLE', station_id: 'stn_001', location: { lng: 72.5714, lat: 23.0258 }, heading: 270, last_location_at: minutesAgo(3), crew_size: 3, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_005', call_sign: 'FE-01', type: 'FIRE_ENGINE', capabilities: ['FIRE_SUPPRESSION'], status: 'ON_SCENE', station_id: 'stn_002', location: { lng: 72.5797, lat: 23.0225 }, heading: 180, last_location_at: minutesAgo(0), crew_size: 4, current_assignment_id: 'asg_002', version: 4, is_simulated: true },
  { id: 'unt_006', call_sign: 'FE-02', type: 'FIRE_ENGINE', capabilities: ['FIRE_SUPPRESSION'], status: 'AVAILABLE', station_id: 'stn_004', location: { lng: 72.6281, lat: 22.9872 }, heading: 90, last_location_at: minutesAgo(5), crew_size: 4, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_007', call_sign: 'FE-03', type: 'FIRE_ENGINE', capabilities: ['FIRE_SUPPRESSION'], status: 'RETURNING', station_id: 'stn_003', location: { lng: 72.5900, lat: 23.0100 }, heading: 300, last_location_at: minutesAgo(1), crew_size: 4, current_assignment_id: null, version: 2, is_simulated: true },
  { id: 'unt_008', call_sign: 'FL-01', type: 'FIRE_LADDER', capabilities: ['FIRE_SUPPRESSION', 'HIGH_RISE_ACCESS'], status: 'AVAILABLE', station_id: 'stn_002', location: { lng: 72.5572, lat: 23.0369 }, heading: 0, last_location_at: minutesAgo(10), crew_size: 3, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_009', call_sign: 'HZ-01', type: 'HAZMAT', capabilities: ['HAZMAT_CONTAINMENT'], status: 'AVAILABLE', station_id: 'stn_004', location: { lng: 72.6300, lat: 22.9890 }, heading: 0, last_location_at: minutesAgo(15), crew_size: 3, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_010', call_sign: 'RT-01', type: 'RESCUE_TECHNICAL', capabilities: ['EXTRICATION', 'HEAVY_LIFT'], status: 'AVAILABLE', station_id: 'stn_002', location: { lng: 72.5580, lat: 23.0360 }, heading: 0, last_location_at: minutesAgo(8), crew_size: 3, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_011', call_sign: 'RT-02', type: 'RESCUE_TECHNICAL', capabilities: ['EXTRICATION'], status: 'EN_ROUTE', station_id: 'stn_003', location: { lng: 72.6050, lat: 23.0080 }, heading: 220, last_location_at: minutesAgo(0), crew_size: 3, current_assignment_id: 'asg_004', version: 3, is_simulated: true },
  { id: 'unt_012', call_sign: 'PP-01', type: 'POLICE_PATROL', capabilities: ['CROWD_CONTROL'], status: 'AVAILABLE', station_id: 'stn_006', location: { lng: 72.5100, lat: 23.0350 }, heading: 0, last_location_at: minutesAgo(2), crew_size: 2, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_013', call_sign: 'PP-02', type: 'POLICE_PATROL', capabilities: ['CROWD_CONTROL'], status: 'ON_SCENE', station_id: 'stn_006', location: { lng: 72.5350, lat: 23.0210 }, heading: 90, last_location_at: minutesAgo(1), crew_size: 2, current_assignment_id: 'asg_005', version: 2, is_simulated: true },
  { id: 'unt_014', call_sign: 'WR-01', type: 'WATER_RESCUE', capabilities: ['WATER_RESCUE'], status: 'AVAILABLE', station_id: 'stn_003', location: { lng: 72.5977, lat: 23.0012 }, heading: 0, last_location_at: minutesAgo(20), crew_size: 4, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_015', call_sign: 'A-08', type: 'AMBULANCE_ALS', capabilities: ['MEDICAL_BASIC', 'MEDICAL_ADVANCED'], status: 'AVAILABLE', station_id: 'stn_006', location: { lng: 72.4650, lat: 23.0310 }, heading: 180, last_location_at: minutesAgo(2), crew_size: 3, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_016', call_sign: 'A-09', type: 'AMBULANCE_BLS', capabilities: ['MEDICAL_BASIC'], status: 'EN_ROUTE', station_id: 'stn_004', location: { lng: 72.6680, lat: 23.0280 }, heading: 90, last_location_at: minutesAgo(1), crew_size: 2, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_017', call_sign: 'FE-04', type: 'FIRE_ENGINE', capabilities: ['FIRE_SUPPRESSION'], status: 'AVAILABLE', station_id: 'stn_002', location: { lng: 72.5820, lat: 23.1080 }, heading: 0, last_location_at: minutesAgo(4), crew_size: 4, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_018', call_sign: 'FE-05', type: 'FIRE_ENGINE', capabilities: ['FIRE_SUPPRESSION'], status: 'ON_SCENE', station_id: 'stn_004', location: { lng: 72.6320, lat: 22.9620 }, heading: 270, last_location_at: minutesAgo(0), crew_size: 4, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_019', call_sign: 'PP-03', type: 'POLICE_PATROL', capabilities: ['CROWD_CONTROL'], status: 'AVAILABLE', station_id: 'stn_006', location: { lng: 72.5020, lat: 23.0780 }, heading: 45, last_location_at: minutesAgo(3), crew_size: 2, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_020', call_sign: 'HZ-02', type: 'HAZMAT', capabilities: ['HAZMAT_CONTAINMENT'], status: 'AVAILABLE', station_id: 'stn_004', location: { lng: 72.6650, lat: 23.0320 }, heading: 135, last_location_at: minutesAgo(5), crew_size: 3, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_021', call_sign: 'FE-06', type: 'FIRE_ENGINE', capabilities: ['FIRE_SUPPRESSION'], status: 'AVAILABLE', station_id: 'stn_006', location: { lng: 72.3750, lat: 22.9980 }, heading: 90, last_location_at: minutesAgo(3), crew_size: 4, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_022', call_sign: 'HZ-03', type: 'HAZMAT', capabilities: ['HAZMAT_CONTAINMENT'], status: 'ON_SCENE', station_id: 'stn_004', location: { lng: 72.4550, lat: 22.7180 }, heading: 180, last_location_at: minutesAgo(1), crew_size: 3, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_023', call_sign: 'A-10', type: 'AMBULANCE_ALS', capabilities: ['MEDICAL_BASIC', 'MEDICAL_ADVANCED'], status: 'AVAILABLE', station_id: 'stn_005', location: { lng: 72.0450, lat: 23.1180 }, heading: 0, last_location_at: minutesAgo(2), crew_size: 3, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_024', call_sign: 'RT-03', type: 'RESCUE_TECHNICAL', capabilities: ['EXTRICATION'], status: 'EN_ROUTE', station_id: 'stn_003', location: { lng: 72.1450, lat: 22.5980 }, heading: 270, last_location_at: minutesAgo(0), crew_size: 3, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_025', call_sign: 'A-11', type: 'AMBULANCE_BLS', capabilities: ['MEDICAL_BASIC'], status: 'AVAILABLE', station_id: 'stn_005', location: { lng: 72.2150, lat: 22.8450 }, heading: 45, last_location_at: minutesAgo(2), crew_size: 2, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_026', call_sign: 'PP-04', type: 'POLICE_PATROL', capabilities: ['CROWD_CONTROL'], status: 'AVAILABLE', station_id: 'stn_006', location: { lng: 72.2280, lat: 22.8550 }, heading: 180, last_location_at: minutesAgo(1), crew_size: 2, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_027', call_sign: 'PP-05', type: 'POLICE_PATROL', capabilities: ['CROWD_CONTROL'], status: 'AVAILABLE', station_id: 'stn_006', location: { lng: 72.3250, lat: 23.0750 }, heading: 90, last_location_at: minutesAgo(2), crew_size: 2, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_028', call_sign: 'WR-02', type: 'WATER_RESCUE', capabilities: ['WATER_RESCUE'], status: 'AVAILABLE', station_id: 'stn_003', location: { lng: 72.5450, lat: 22.7450 }, heading: 0, last_location_at: minutesAgo(1), crew_size: 3, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_029', call_sign: 'A-12', type: 'AMBULANCE_ALS', capabilities: ['MEDICAL_BASIC', 'MEDICAL_ADVANCED'], status: 'AVAILABLE', station_id: 'stn_005', location: { lng: 72.1550, lat: 23.0250 }, heading: 45, last_location_at: minutesAgo(2), crew_size: 3, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_030', call_sign: 'FE-08', type: 'FIRE_ENGINE', capabilities: ['FIRE_SUPPRESSION'], status: 'AVAILABLE', station_id: 'stn_002', location: { lng: 72.2650, lat: 22.9650 }, heading: 180, last_location_at: minutesAgo(1), crew_size: 4, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_031', call_sign: 'PP-06', type: 'POLICE_PATROL', capabilities: ['CROWD_CONTROL'], status: 'AVAILABLE', station_id: 'stn_006', location: { lng: 72.2950, lat: 22.6350 }, heading: 270, last_location_at: minutesAgo(2), crew_size: 2, current_assignment_id: null, version: 1, is_simulated: true },
  { id: 'unt_032', call_sign: 'WR-03', type: 'WATER_RESCUE', capabilities: ['WATER_RESCUE'], status: 'AVAILABLE', station_id: 'stn_003', location: { lng: 72.4250, lat: 22.5850 }, heading: 90, last_location_at: minutesAgo(1), crew_size: 3, current_assignment_id: null, version: 1, is_simulated: true },
];

// ——— HOSPITALS (6) ———
export const MOCK_HOSPITALS = [
  { id: 'hsp_001', name: 'Civil Hospital', location: { lng: 72.5835, lat: 23.0230 }, beds_total: 200, beds_available: 42, icu_available: 3, specialities: ['TRAUMA', 'BURNS', 'ICU'], updated_at: minutesAgo(5), is_simulated: true },
  { id: 'hsp_002', name: 'VS General Hospital', location: { lng: 72.6000, lat: 23.0180 }, beds_total: 150, beds_available: 28, icu_available: 5, specialities: ['TRAUMA', 'CARDIAC', 'ICU'], updated_at: minutesAgo(5), is_simulated: true },
  { id: 'hsp_003', name: 'Sterling Hospital', location: { lng: 72.5300, lat: 23.0370 }, beds_total: 120, beds_available: 35, icu_available: 8, specialities: ['TRAUMA', 'NEURO', 'CARDIAC', 'ICU'], updated_at: minutesAgo(10), is_simulated: true },
  { id: 'hsp_004', name: 'SAL Hospital', location: { lng: 72.5100, lat: 23.0470 }, beds_total: 100, beds_available: 18, icu_available: 2, specialities: ['CARDIAC', 'ICU'], updated_at: minutesAgo(10), is_simulated: true },
  { id: 'hsp_005', name: 'Sola Civil Hospital', location: { lng: 72.5050, lat: 23.0700 }, beds_total: 80, beds_available: 22, icu_available: 4, specialities: ['TRAUMA', 'ICU'], updated_at: minutesAgo(15), is_simulated: true },
  { id: 'hsp_006', name: 'LG Hospital', location: { lng: 72.5610, lat: 23.0150 }, beds_total: 180, beds_available: 50, icu_available: 6, specialities: ['TRAUMA', 'BURNS', 'PEDIATRIC', 'ICU'], updated_at: minutesAgo(5), is_simulated: true },
];

// ——— INCIDENTS (8 seed, covering every severity band) ———
export const MOCK_INCIDENTS = [
  {
    id: 'inc_001', code: 'INC-2026-0147', type: 'FIRE_STRUCTURE', status: 'DISPATCHED',
    severity: 'CRITICAL', severity_score: 87,
    title: 'Structure fire with trapped persons — Sabarmati Riverfront',
    location: { lng: 72.5797, lat: 23.0225 }, address: 'Near Sabarmati Ashram, Riverfront Rd', ward: 'Sabarmati',
    report_count: 5, assigned_unit_count: 2, units_required: 5,
    has_conflict: true, has_pending_recommendation: true,
    occurred_at: minutesAgo(18), updated_at: minutesAgo(2), version: 8, is_simulated: true,
    description: 'Multiple reports of a large structure fire near Sabarmati Riverfront. Citizen calls report thick smoke and people potentially trapped on the 2nd floor. IoT heat sensor HS-14 shows conflicting data with low temperature reading.',
    beliefs: [
      { attribute: 'fire_active', probability: 0.92, log_odds: 2.44, state: 'SUPPORTED', supporting_weight: 3.2, refuting_weight: 0.1, evidence_ids: ['evd_001','evd_002','evd_005'], last_updated_at: minutesAgo(3) },
      { attribute: 'people_trapped', probability: 0.71, log_odds: 0.89, state: 'CONTESTED', supporting_weight: 1.8, refuting_weight: 0.95, evidence_ids: ['evd_001','evd_003','evd_004'], last_updated_at: minutesAgo(2) },
      { attribute: 'smoke_heavy', probability: 0.88, log_odds: 2.0, state: 'SUPPORTED', supporting_weight: 2.5, refuting_weight: 0.0, evidence_ids: ['evd_001','evd_002'], last_updated_at: minutesAgo(5) },
      { attribute: 'structural_damage', probability: 0.45, log_odds: -0.20, state: 'UNKNOWN', supporting_weight: 0.6, refuting_weight: 0.5, evidence_ids: ['evd_003'], last_updated_at: minutesAgo(8) },
    ],
    severity_assessment: {
      severity: 'CRITICAL', score: 87,
      factors: [
        { key: 'life_risk', label: 'Risk to life', raw: 0.71, weight: 0.30, contribution: 21.3, explanation: 'belief(people_trapped)=0.71 from 3 sources (CONTESTED)', evidence_ids: ['evd_001','evd_003','evd_004'] },
        { key: 'hazard_class', label: 'Hazard class', raw: 0.82, weight: 0.16, contribution: 13.1, explanation: 'FIRE_STRUCTURE base 0.75 × fire_active(0.92)', evidence_ids: ['evd_001','evd_002','evd_005'] },
        { key: 'spread_potential', label: 'Spread potential', raw: 0.81, weight: 0.14, contribution: 11.3, explanation: 'fire_active(0.92) × smoke_heavy(0.88)', evidence_ids: ['evd_001','evd_002'] },
        { key: 'exposure', label: 'Population exposure', raw: 0.68, weight: 0.12, contribution: 8.2, explanation: 'High-density area near riverfront, population weight 0.68', evidence_ids: [] },
        { key: 'infrastructure_criticality', label: 'Infrastructure', raw: 0.55, weight: 0.10, contribution: 5.5, explanation: 'Heritage zone, 180 m from school', evidence_ids: [] },
        { key: 'time_sensitivity', label: 'Time sensitivity', raw: 0.90, weight: 0.10, contribution: 9.0, explanation: 'FIRE_STRUCTURE urgency: 18 min since occurred_at', evidence_ids: [] },
        { key: 'access_difficulty', label: 'Access difficulty', raw: 0.72, weight: 0.08, contribution: 5.8, explanation: 'Narrow streets near riverfront, ETA +3:20 vs SLA', evidence_ids: [] },
      ],
      hard_rules_triggered: ['TRAPPED_MIN_CRITICAL'],
      evidence_confidence: 0.78,
      confidence_note: 'Held pending verification: contested attribute (people_trapped)',
      counterfactuals: [
        { if_attribute: 'people_trapped', were: false, then_severity: 'MODERATE', then_score: 48 },
        { if_attribute: 'fire_active', were: false, then_severity: 'LOW', then_score: 28 },
        { if_attribute: 'smoke_heavy', were: false, then_severity: 'HIGH', then_score: 72 },
      ],
      computed_at: minutesAgo(2), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [
      { id: 'evd_001', incident_id: 'inc_001', report_id: 'rep_001', source_type: 'EMERGENCY_CALL', source_label: 'Citizen call +91••••1234', attribute: 'people_trapped', claimed_value: true, asserted_probability: 0.80, extraction_confidence: 0.75, source_reliability: 0.62, weight: 0.372, observed_at: minutesAgo(18), created_at: minutesAgo(17), is_simulated: true, superseded: false },
      { id: 'evd_002', incident_id: 'inc_001', report_id: 'rep_002', source_type: 'CITIZEN_APP', source_label: 'Citizen app user', attribute: 'fire_active', claimed_value: true, asserted_probability: 0.90, extraction_confidence: 0.82, source_reliability: 0.55, weight: 0.405, observed_at: minutesAgo(16), created_at: minutesAgo(15), is_simulated: true, superseded: false },
      { id: 'evd_003', incident_id: 'inc_001', report_id: 'rep_003', source_type: 'IOT_SENSOR', source_label: 'Heat sensor HS-14', attribute: 'people_trapped', claimed_value: false, asserted_probability: 0.35, extraction_confidence: 0.90, source_reliability: 0.82, weight: 0.664, observed_at: minutesAgo(14), created_at: minutesAgo(13), is_simulated: true, superseded: false },
      { id: 'evd_004', incident_id: 'inc_001', report_id: 'rep_004', source_type: 'FIELD_UNIT', source_label: 'FE-01 crew', attribute: 'fire_active', claimed_value: true, asserted_probability: 0.95, extraction_confidence: 0.92, source_reliability: 0.93, weight: 0.812, observed_at: minutesAgo(8), created_at: minutesAgo(7), is_simulated: true, superseded: false },
      { id: 'evd_005', incident_id: 'inc_001', report_id: 'rep_005', source_type: 'SOCIAL_MEDIA', source_label: 'Twitter @ahmd_news', attribute: 'smoke_heavy', claimed_value: true, asserted_probability: 0.70, extraction_confidence: 0.60, source_reliability: 0.35, weight: 0.147, observed_at: minutesAgo(15), created_at: minutesAgo(14), is_simulated: true, superseded: false },
    ],
    assignments: [
      { id: 'asg_002', incident_id: 'inc_001', unit_id: 'unt_005', unit_call_sign: 'FE-01', status: 'ON_SCENE', eta_seconds: null, eta_method: 'ROAD_GRAPH', distance_m: 1200, proposed_by: 'SYSTEM', approved_by_user_id: 'usr_002', preempted_from_incident_id: null, rationale: ['Nearest fire engine', 'FIRE_SUPPRESSION capability match'], cost_breakdown: { eta: 320, capability: 0, workload: 0, preemption: 0, specialisation: -60 }, proposed_at: minutesAgo(16), approved_at: minutesAgo(15), arrived_at: minutesAgo(8), completed_at: null, version: 3 },
      { id: 'asg_001', incident_id: 'inc_001', unit_id: 'unt_002', unit_call_sign: 'A-02', status: 'EN_ROUTE', eta_seconds: 240, eta_method: 'ROAD_GRAPH', distance_m: 2800, proposed_by: 'SYSTEM', approved_by_user_id: 'usr_002', preempted_from_incident_id: null, rationale: ['MEDICAL_BASIC capability', 'ETA 4:00'], cost_breakdown: { eta: 240, capability: 0, workload: 0, preemption: 0, specialisation: 0 }, proposed_at: minutesAgo(12), approved_at: minutesAgo(11), arrived_at: null, completed_at: null, version: 2 },
    ],
    links: [],
    ai: { classification_confidence: 0.91, suggested_type: 'FIRE_STRUCTURE', briefing: 'Structure fire at Sabarmati Riverfront with conflicting reports on trapped persons. 2 units dispatched, 3 more required. Contested: people_trapped (citizen says yes, sensor says no).', degraded: false },
    required_capabilities: ['FIRE_SUPPRESSION', 'FIRE_SUPPRESSION', 'EXTRICATION', 'MEDICAL_ADVANCED', 'COMMAND'],
    timeline_seq: 482,
  },
  {
    id: 'inc_002', code: 'INC-2026-0148', type: 'ROAD_ACCIDENT', status: 'ON_SCENE',
    severity: 'HIGH', severity_score: 72,
    title: 'Multi-vehicle collision — SG Highway near Thaltej',
    location: { lng: 72.5020, lat: 23.0450 }, address: 'SG Highway, near Thaltej Cross Road', ward: 'Thaltej',
    report_count: 9, assigned_unit_count: 3, units_required: 3,
    has_conflict: false, has_pending_recommendation: false,
    occurred_at: minutesAgo(35), updated_at: minutesAgo(5), version: 12, is_simulated: true,
    description: 'Multi-vehicle pileup on SG Highway. 3 vehicles involved, 2 casualties reported. Road partially blocked.',
    beliefs: [
      { attribute: 'casualties_reported', probability: 0.88, log_odds: 2.0, state: 'SUPPORTED', supporting_weight: 3.5, refuting_weight: 0.0, evidence_ids: ['evd_010','evd_011'], last_updated_at: minutesAgo(10) },
      { attribute: 'road_blocked', probability: 0.82, log_odds: 1.52, state: 'SUPPORTED', supporting_weight: 2.1, refuting_weight: 0.2, evidence_ids: ['evd_012'], last_updated_at: minutesAgo(8) },
    ],
    severity_assessment: {
      severity: 'HIGH', score: 72,
      factors: [
        { key: 'life_risk', label: 'Risk to life', raw: 0.88, weight: 0.30, contribution: 26.4, explanation: 'belief(casualties_reported)=0.88 from 2 independent sources', evidence_ids: [] },
        { key: 'hazard_class', label: 'Hazard class', raw: 0.45, weight: 0.16, contribution: 7.2, explanation: 'ROAD_ACCIDENT base 0.45', evidence_ids: [] },
        { key: 'exposure', label: 'Population exposure', raw: 0.55, weight: 0.12, contribution: 6.6, explanation: 'Major highway, moderate traffic density', evidence_ids: [] },
      ],
      hard_rules_triggered: [], evidence_confidence: 0.85, confidence_note: null,
      counterfactuals: [
        { if_attribute: 'casualties_reported', were: false, then_severity: 'MODERATE', then_score: 42 },
      ],
      computed_at: minutesAgo(5), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.94, suggested_type: 'ROAD_ACCIDENT', briefing: 'Multi-vehicle collision on SG Highway. 2 casualties, road partially blocked. 3 units on scene.', degraded: false },
    required_capabilities: ['MEDICAL_BASIC', 'EXTRICATION', 'CROWD_CONTROL'], timeline_seq: 401,
  },
  {
    id: 'inc_003', code: 'INC-2026-0149', type: 'FLOOD', status: 'TRIAGED',
    severity: 'MODERATE', severity_score: 52,
    title: 'Street flooding — Maninagar underpass',
    location: { lng: 72.5977, lat: 23.0012 }, address: 'Maninagar Railway Underpass', ward: 'Maninagar',
    report_count: 3, assigned_unit_count: 1, units_required: 2,
    has_conflict: false, has_pending_recommendation: true,
    occurred_at: minutesAgo(45), updated_at: minutesAgo(10), version: 5, is_simulated: true,
    description: 'Waterlogging reported at Maninagar railway underpass. Water depth approx 2 feet. Some vehicles stranded.',
    beliefs: [
      { attribute: 'water_depth_high', probability: 0.72, log_odds: 0.94, state: 'SUPPORTED', supporting_weight: 1.8, refuting_weight: 0.1, evidence_ids: [], last_updated_at: minutesAgo(12) },
      { attribute: 'road_blocked', probability: 0.65, log_odds: 0.62, state: 'SUPPORTED', supporting_weight: 1.2, refuting_weight: 0.3, evidence_ids: [], last_updated_at: minutesAgo(15) },
    ],
    severity_assessment: {
      severity: 'MODERATE', score: 52,
      factors: [
        { key: 'life_risk', label: 'Risk to life', raw: 0.25, weight: 0.30, contribution: 7.5, explanation: 'No casualties or trapped persons reported', evidence_ids: [] },
        { key: 'hazard_class', label: 'Hazard class', raw: 0.40, weight: 0.16, contribution: 6.4, explanation: 'FLOOD base 0.40 × water_depth_high(0.72)', evidence_ids: [] },
      ],
      hard_rules_triggered: [], evidence_confidence: 0.70, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(10), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.88, suggested_type: 'FLOOD', briefing: 'Street flooding at Maninagar underpass. Approx 2 ft water, vehicles stranded. No casualties.', degraded: false },
    required_capabilities: ['WATER_RESCUE', 'CROWD_CONTROL'], timeline_seq: 350,
  },
  {
    id: 'inc_004', code: 'INC-2026-0150', type: 'GAS_LEAK', status: 'REPORTED',
    severity: 'HIGH', severity_score: 65,
    title: 'Suspected gas leak — Naroda Industrial Area',
    location: { lng: 72.6520, lat: 23.0580 }, address: 'Phase 2, Naroda GIDC', ward: 'Naroda',
    report_count: 2, assigned_unit_count: 0, units_required: 3,
    has_conflict: false, has_pending_recommendation: true,
    occurred_at: minutesAgo(8), updated_at: minutesAgo(6), version: 3, is_simulated: true,
    description: 'Strong gas smell reported by two independent callers near Naroda GIDC. No visible leak source yet.',
    beliefs: [
      { attribute: 'gas_leak', probability: 0.78, log_odds: 1.26, state: 'SUPPORTED', supporting_weight: 1.6, refuting_weight: 0.1, evidence_ids: [], last_updated_at: minutesAgo(7) },
      { attribute: 'chemical_hazard', probability: 0.55, log_odds: 0.20, state: 'UNKNOWN', supporting_weight: 0.8, refuting_weight: 0.5, evidence_ids: [], last_updated_at: minutesAgo(7) },
    ],
    severity_assessment: {
      severity: 'HIGH', score: 65,
      factors: [
        { key: 'life_risk', label: 'Risk to life', raw: 0.40, weight: 0.30, contribution: 12.0, explanation: 'Gas leak near industrial area, potential for large-scale exposure', evidence_ids: [] },
        { key: 'hazard_class', label: 'Hazard class', raw: 0.90, weight: 0.16, contribution: 14.4, explanation: 'GAS_LEAK base 0.90', evidence_ids: [] },
      ],
      hard_rules_triggered: [], evidence_confidence: 0.65, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(6), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.72, suggested_type: 'GAS_LEAK', briefing: 'Suspected gas leak at Naroda GIDC. Two independent callers, no visual confirmation yet.', degraded: false },
    required_capabilities: ['HAZMAT_CONTAINMENT', 'MEDICAL_ADVANCED', 'COMMAND'], timeline_seq: 470,
  },
  {
    id: 'inc_005', code: 'INC-2026-0151', type: 'MEDICAL_EMERGENCY', status: 'DISPATCHED',
    severity: 'MODERATE', severity_score: 45,
    title: 'Cardiac emergency — Paldi residential area',
    location: { lng: 72.5620, lat: 23.0105 }, address: '14, Shroff Colony, Paldi', ward: 'Paldi',
    report_count: 1, assigned_unit_count: 1, units_required: 1,
    has_conflict: false, has_pending_recommendation: false,
    occurred_at: minutesAgo(12), updated_at: minutesAgo(8), version: 4, is_simulated: true,
    description: 'Elderly patient with chest pain and breathing difficulty. Family member called via citizen app.',
    beliefs: [
      { attribute: 'casualties_reported', probability: 0.65, log_odds: 0.62, state: 'SUPPORTED', supporting_weight: 1.1, refuting_weight: 0.0, evidence_ids: [], last_updated_at: minutesAgo(10) },
    ],
    severity_assessment: {
      severity: 'MODERATE', score: 45,
      factors: [
        { key: 'life_risk', label: 'Risk to life', raw: 0.65, weight: 0.30, contribution: 19.5, explanation: 'Cardiac symptom reported by family member', evidence_ids: [] },
        { key: 'time_sensitivity', label: 'Time sensitivity', raw: 0.95, weight: 0.10, contribution: 9.5, explanation: 'MEDICAL_EMERGENCY: golden hour urgency, 12 min elapsed', evidence_ids: [] },
      ],
      hard_rules_triggered: [], evidence_confidence: 0.55, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(8), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.82, suggested_type: 'MEDICAL_EMERGENCY', briefing: null, degraded: false },
    required_capabilities: ['MEDICAL_BASIC'], timeline_seq: 440,
  },
  {
    id: 'inc_006', code: 'INC-2026-0152', type: 'ELECTRICAL_HAZARD', status: 'RESOLVED',
    severity: 'LOW', severity_score: 22,
    title: 'Downed power line — Vastrapur',
    location: { lng: 72.5280, lat: 23.0380 }, address: 'Vastrapur Lake Rd', ward: 'Vastrapur',
    report_count: 2, assigned_unit_count: 0, units_required: 1,
    has_conflict: false, has_pending_recommendation: false,
    occurred_at: minutesAgo(90), updated_at: minutesAgo(30), version: 6, is_simulated: true,
    description: 'Power line downed by wind. Area cordoned off. UGVCL crew dispatched.',
    beliefs: [
      { attribute: 'power_down', probability: 0.95, log_odds: 2.94, state: 'SUPPORTED', supporting_weight: 2.8, refuting_weight: 0.0, evidence_ids: [], last_updated_at: minutesAgo(35) },
    ],
    severity_assessment: {
      severity: 'LOW', score: 22,
      factors: [],
      hard_rules_triggered: [], evidence_confidence: 0.90, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(30), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.95, suggested_type: 'ELECTRICAL_HAZARD', briefing: null, degraded: false },
    required_capabilities: ['POWER_ISOLATION'], timeline_seq: 280,
  },
  {
    id: 'inc_007', code: 'INC-2026-0153', type: 'CROWD_INCIDENT', status: 'ON_SCENE',
    severity: 'MODERATE', severity_score: 40,
    title: 'Large crowd gathering — Kankaria Lake',
    location: { lng: 72.5980, lat: 23.0070 }, address: 'Kankaria Lake, South Gate', ward: 'Maninagar',
    report_count: 4, assigned_unit_count: 1, units_required: 2,
    has_conflict: false, has_pending_recommendation: false,
    occurred_at: minutesAgo(55), updated_at: minutesAgo(15), version: 7, is_simulated: true,
    description: 'Large unplanned gathering near Kankaria Lake south gate. Estimated 2000+ people. Minor scuffles reported.',
    beliefs: [
      { attribute: 'crowd_large', probability: 0.90, log_odds: 2.20, state: 'SUPPORTED', supporting_weight: 2.5, refuting_weight: 0.0, evidence_ids: [], last_updated_at: minutesAgo(20) },
    ],
    severity_assessment: {
      severity: 'MODERATE', score: 40,
      factors: [],
      hard_rules_triggered: [], evidence_confidence: 0.82, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(15), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.78, suggested_type: 'CROWD_INCIDENT', briefing: null, degraded: false },
    required_capabilities: ['CROWD_CONTROL', 'MEDICAL_BASIC'], timeline_seq: 310,
  },
  {
    id: 'inc_008', code: 'INC-2026-0154', type: 'FIRE_VEHICLE', status: 'CONTAINED',
    severity: 'INFO', severity_score: 12,
    title: 'Vehicle fire (contained) — Ashram Road',
    location: { lng: 72.5710, lat: 23.0290 }, address: 'Ashram Road, near Income Tax junction', ward: 'Ellisbridge',
    report_count: 1, assigned_unit_count: 0, units_required: 0,
    has_conflict: false, has_pending_recommendation: false,
    occurred_at: minutesAgo(120), updated_at: minutesAgo(60), version: 4, is_simulated: true,
    description: 'Minor vehicle fire on Ashram Road. Self-extinguished. Traffic restored.',
    beliefs: [],
    severity_assessment: {
      severity: 'INFO', score: 12,
      factors: [],
      hard_rules_triggered: [], evidence_confidence: 0.92, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(60), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.90, suggested_type: 'FIRE_VEHICLE', briefing: null, degraded: true },
    required_capabilities: [], timeline_seq: 200,
  },
  {
    id: 'inc_009', code: 'INC-2026-0155', type: 'FIRE_STRUCTURE', status: 'REPORTED',
    severity: 'HIGH', severity_score: 78,
    title: 'Commercial Complex Fire — Chandkheda',
    location: { lng: 72.5850, lat: 23.1100 }, address: 'BRTS Main Rd, Chandkheda', ward: 'Chandkheda',
    report_count: 4, assigned_unit_count: 1, units_required: 3,
    has_conflict: false, has_pending_recommendation: true,
    occurred_at: minutesAgo(14), updated_at: minutesAgo(3), version: 4, is_simulated: true,
    description: 'Dense smoke issuing from 3rd floor commercial office space near Chandkheda BRTS bus stop.',
    beliefs: [
      { attribute: 'fire_active', probability: 0.88, log_odds: 2.0, state: 'SUPPORTED', supporting_weight: 2.4, refuting_weight: 0.1, evidence_ids: [], last_updated_at: minutesAgo(4) },
    ],
    severity_assessment: {
      severity: 'HIGH', score: 78,
      factors: [], hard_rules_triggered: [], evidence_confidence: 0.85, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(3), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.92, suggested_type: 'FIRE_STRUCTURE', briefing: 'Commercial complex fire in Chandkheda. 1 unit assigned, 2 more recommended.', degraded: false },
    required_capabilities: ['FIRE_SUPPRESSION', 'HIGH_RISE_ACCESS'], timeline_seq: 490,
  },
  {
    id: 'inc_010', code: 'INC-2026-0156', type: 'GAS_LEAK', status: 'DISPATCHED',
    severity: 'CRITICAL', severity_score: 84,
    title: 'PNG Pipeline Rupture — Bopal South',
    location: { lng: 72.4680, lat: 23.0330 }, address: 'TRP Mall Road, South Bopal', ward: 'Bopal',
    report_count: 7, assigned_unit_count: 2, units_required: 4,
    has_conflict: true, has_pending_recommendation: true,
    occurred_at: minutesAgo(22), updated_at: minutesAgo(1), version: 6, is_simulated: true,
    description: 'Excavator damaged underground natural gas feeder pipeline causing major PNG release near high-density residential towers in South Bopal.',
    beliefs: [
      { attribute: 'gas_leak', probability: 0.96, log_odds: 3.18, state: 'SUPPORTED', supporting_weight: 3.8, refuting_weight: 0.0, evidence_ids: [], last_updated_at: minutesAgo(2) },
      { attribute: 'evacuation_required', probability: 0.85, log_odds: 1.73, state: 'SUPPORTED', supporting_weight: 2.2, refuting_weight: 0.2, evidence_ids: [], last_updated_at: minutesAgo(2) },
    ],
    severity_assessment: {
      severity: 'CRITICAL', score: 84,
      factors: [], hard_rules_triggered: ['GAS_LEAK_CRITICAL'], evidence_confidence: 0.88, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(1), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.95, suggested_type: 'GAS_LEAK', briefing: 'Major PNG pipeline breach in South Bopal. Evacuation of nearby apartments in progress.', degraded: false },
    required_capabilities: ['HAZMAT_CONTAINMENT', 'CROWD_CONTROL', 'MEDICAL_ADVANCED'], timeline_seq: 495,
  },
  {
    id: 'inc_011', code: 'INC-2026-0157', type: 'HAZMAT', status: 'TRIAGED',
    severity: 'MODERATE', severity_score: 58,
    title: 'Chemical Spill — Science City Road',
    location: { lng: 72.5050, lat: 23.0800 }, address: 'Science City Rd, near Sola Flyover', ward: 'Sola',
    report_count: 3, assigned_unit_count: 1, units_required: 2,
    has_conflict: false, has_pending_recommendation: true,
    occurred_at: minutesAgo(30), updated_at: minutesAgo(12), version: 5, is_simulated: true,
    description: 'Small chemical container fell from transport truck spilling solvent onto service road.',
    beliefs: [
      { attribute: 'chemical_hazard', probability: 0.76, log_odds: 1.15, state: 'SUPPORTED', supporting_weight: 1.9, refuting_weight: 0.1, evidence_ids: [], last_updated_at: minutesAgo(13) },
    ],
    severity_assessment: {
      severity: 'MODERATE', score: 58,
      factors: [], hard_rules_triggered: [], evidence_confidence: 0.80, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(12), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.87, suggested_type: 'HAZMAT', briefing: 'Solvent spill on Science City Rd. Hazmat containment unit recommended.', degraded: false },
    required_capabilities: ['HAZMAT_CONTAINMENT'], timeline_seq: 430,
  },
  {
    id: 'inc_012', code: 'INC-2026-0158', type: 'FIRE_STRUCTURE', status: 'ON_SCENE',
    severity: 'CRITICAL', severity_score: 91,
    title: 'Textile Mill Boiler Explosion — Odhav GIDC',
    location: { lng: 72.6700, lat: 23.0300 }, address: 'Phase 3, Odhav GIDC Industrial Estate', ward: 'Odhav',
    report_count: 11, assigned_unit_count: 4, units_required: 6,
    has_conflict: false, has_pending_recommendation: true,
    occurred_at: minutesAgo(40), updated_at: minutesAgo(4), version: 14, is_simulated: true,
    description: 'Industrial boiler rupture triggered secondary chemical fire inside textile dyeing factory. Multiple casualties and trapped workers.',
    beliefs: [
      { attribute: 'fire_active', probability: 0.98, log_odds: 3.89, state: 'SUPPORTED', supporting_weight: 4.5, refuting_weight: 0.0, evidence_ids: [], last_updated_at: minutesAgo(5) },
      { attribute: 'people_trapped', probability: 0.89, log_odds: 2.09, state: 'SUPPORTED', supporting_weight: 3.1, refuting_weight: 0.1, evidence_ids: [], last_updated_at: minutesAgo(5) },
    ],
    severity_assessment: {
      severity: 'CRITICAL', score: 91,
      factors: [], hard_rules_triggered: ['INDUSTRIAL_BOILER_EXPLOSION'], evidence_confidence: 0.94, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(4), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.97, suggested_type: 'FIRE_STRUCTURE', briefing: 'Boiler blast and chemical fire at Odhav GIDC. 4 units on scene, 2 additional heavy units requested.', degraded: false },
    required_capabilities: ['FIRE_SUPPRESSION', 'FIRE_SUPPRESSION', 'EXTRICATION', 'MEDICAL_ADVANCED'], timeline_seq: 510,
  },
  {
    id: 'inc_013', code: 'INC-2026-0159', type: 'ROAD_ACCIDENT', status: 'DISPATCHED',
    severity: 'HIGH', severity_score: 76,
    title: 'Tanker Collision & Leak — Vatva Ring Road',
    location: { lng: 72.6350, lat: 22.9650 }, address: 'SP Ring Road Junction, Vatva', ward: 'Vatva',
    report_count: 6, assigned_unit_count: 2, units_required: 3,
    has_conflict: false, has_pending_recommendation: false,
    occurred_at: minutesAgo(28), updated_at: minutesAgo(7), version: 8, is_simulated: true,
    description: 'Diesel tanker overturned after colliding with freight lorry. Fuel spreading across carriageway.',
    beliefs: [
      { attribute: 'fuel_leak', probability: 0.92, log_odds: 2.44, state: 'SUPPORTED', supporting_weight: 2.8, refuting_weight: 0.1, evidence_ids: [], last_updated_at: minutesAgo(8) },
    ],
    severity_assessment: {
      severity: 'HIGH', score: 76,
      factors: [], hard_rules_triggered: [], evidence_confidence: 0.89, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(7), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.91, suggested_type: 'ROAD_ACCIDENT', briefing: 'Diesel leak on SP Ring Road Vatva. Foam suppression unit required.', degraded: false },
    required_capabilities: ['HAZMAT_CONTAINMENT', 'FIRE_SUPPRESSION', 'CROWD_CONTROL'], timeline_seq: 460,
  },
  {
    id: 'inc_014', code: 'INC-2026-0160', type: 'ROAD_ACCIDENT', status: 'TRIAGED',
    severity: 'MODERATE', severity_score: 48,
    title: 'Highway Truck Breakdown — Sarkhej Flyover',
    location: { lng: 72.5000, lat: 22.9850 }, address: 'Sarkhej-Gandhinagar Highway, Sarkhej', ward: 'Sarkhej',
    report_count: 2, assigned_unit_count: 0, units_required: 1,
    has_conflict: false, has_pending_recommendation: true,
    occurred_at: minutesAgo(50), updated_at: minutesAgo(20), version: 3, is_simulated: true,
    description: 'Heavy goods vehicle stalled on flyover causing 1.5 km traffic backup.',
    beliefs: [],
    severity_assessment: {
      severity: 'MODERATE', score: 48,
      factors: [], hard_rules_triggered: [], evidence_confidence: 0.82, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(20), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.86, suggested_type: 'ROAD_ACCIDENT', briefing: 'Highway obstruction at Sarkhej flyover. Police patrol unit recommended.', degraded: false },
    required_capabilities: ['CROWD_CONTROL'], timeline_seq: 320,
  },
  {
    id: 'inc_015', code: 'INC-2026-0161', type: 'FIRE_STRUCTURE', status: 'REPORTED',
    severity: 'HIGH', severity_score: 75,
    title: 'Sanand Auto Hub Industrial Fire',
    location: { lng: 72.3800, lat: 23.0050 }, address: 'Sanand GIDC Auto Cluster', ward: 'Sanand',
    report_count: 5, assigned_unit_count: 1, units_required: 3,
    has_conflict: false, has_pending_recommendation: true,
    occurred_at: minutesAgo(16), updated_at: minutesAgo(4), version: 4, is_simulated: true,
    description: 'Structure fire in auto component warehouse at Sanand GIDC.',
    beliefs: [],
    severity_assessment: {
      severity: 'HIGH', score: 75,
      factors: [], hard_rules_triggered: [], evidence_confidence: 0.88, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(4), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.93, suggested_type: 'FIRE_STRUCTURE', briefing: 'Fire reported in Sanand GIDC auto warehouse.', degraded: false },
    required_capabilities: ['FIRE_SUPPRESSION'], timeline_seq: 520,
  },
  {
    id: 'inc_016', code: 'INC-2026-0162', type: 'GAS_LEAK', status: 'ON_SCENE',
    severity: 'CRITICAL', severity_score: 88,
    title: 'Chemical Tanker Leak — Dholka Industrial Zone',
    location: { lng: 72.4600, lat: 22.7250 }, address: 'Dholka-Kheda Highway, Dholka', ward: 'Dholka',
    report_count: 8, assigned_unit_count: 2, units_required: 4,
    has_conflict: false, has_pending_recommendation: true,
    occurred_at: minutesAgo(35), updated_at: minutesAgo(2), version: 7, is_simulated: true,
    description: 'Chlorine gas leakage from transport tanker near Dholka chemical estate.',
    beliefs: [],
    severity_assessment: {
      severity: 'CRITICAL', score: 88,
      factors: [], hard_rules_triggered: ['CHLORINE_HAZMAT_ALERT'], evidence_confidence: 0.92, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(2), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.96, suggested_type: 'GAS_LEAK', briefing: 'Toxic gas leak in Dholka. Hazmat crew on scene.', degraded: false },
    required_capabilities: ['HAZMAT_CONTAINMENT', 'MEDICAL_ADVANCED'], timeline_seq: 530,
  },
  {
    id: 'inc_017', code: 'INC-2026-0163', type: 'ROAD_ACCIDENT', status: 'DISPATCHED',
    severity: 'HIGH', severity_score: 72,
    title: 'Highway Bus Collision — Viramgam Highway',
    location: { lng: 72.0500, lat: 23.1250 }, address: 'Viramgam Bypass, Viramgam', ward: 'Viramgam',
    report_count: 6, assigned_unit_count: 2, units_required: 3,
    has_conflict: false, has_pending_recommendation: false,
    occurred_at: minutesAgo(25), updated_at: minutesAgo(5), version: 5, is_simulated: true,
    description: 'State transport bus collided with loaded truck on Viramgam bypass. Multiple injured passengers.',
    beliefs: [],
    severity_assessment: {
      severity: 'HIGH', score: 72,
      factors: [], hard_rules_triggered: [], evidence_confidence: 0.86, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(5), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.91, suggested_type: 'ROAD_ACCIDENT', briefing: 'Passenger bus crash near Viramgam.', degraded: false },
    required_capabilities: ['MEDICAL_BASIC', 'EXTRICATION'], timeline_seq: 540,
  },
  {
    id: 'inc_018', code: 'INC-2026-0164', type: 'ROAD_ACCIDENT', status: 'DISPATCHED',
    severity: 'CRITICAL', severity_score: 82,
    title: 'Multi-Vehicle Pileup — Bagodara Junction',
    location: { lng: 72.1500, lat: 22.6050 }, address: 'Bagodara Highway Crossroad', ward: 'Bagodara',
    report_count: 9, assigned_unit_count: 3, units_required: 4,
    has_conflict: false, has_pending_recommendation: true,
    occurred_at: minutesAgo(20), updated_at: minutesAgo(3), version: 8, is_simulated: true,
    description: 'Four-vehicle pileup at Bagodara junction due to heavy morning dust storm. Traffic blocked on Rajkot highway.',
    beliefs: [],
    severity_assessment: {
      severity: 'CRITICAL', score: 82,
      factors: [], hard_rules_triggered: [], evidence_confidence: 0.90, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(3), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.94, suggested_type: 'ROAD_ACCIDENT', briefing: 'Major pileup at Bagodara junction.', degraded: false },
    required_capabilities: ['EXTRICATION', 'MEDICAL_ADVANCED', 'CROWD_CONTROL'], timeline_seq: 550,
  },
  {
    id: 'inc_019', code: 'INC-2026-0165', type: 'FIRE_STRUCTURE', status: 'TRIAGED',
    severity: 'MODERATE', severity_score: 46,
    title: 'Grain Storage Shed Fire — Bavla Rural',
    location: { lng: 72.2200, lat: 22.8500 }, address: 'Bavla-Nalsarovar Road, Bavla', ward: 'Bavla',
    report_count: 2, assigned_unit_count: 0, units_required: 1,
    has_conflict: false, has_pending_recommendation: true,
    occurred_at: minutesAgo(40), updated_at: minutesAgo(15), version: 3, is_simulated: true,
    description: 'Minor fire in agricultural grain storage shed near Bavla. No casualties or toxic chemical risk.',
    beliefs: [],
    severity_assessment: {
      severity: 'MODERATE', score: 46,
      factors: [], hard_rules_triggered: [], evidence_confidence: 0.85, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(15), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.88, suggested_type: 'FIRE_STRUCTURE', briefing: 'Minor grain shed fire in Bavla rural sector.', degraded: false },
    required_capabilities: ['FIRE_SUPPRESSION'], timeline_seq: 560,
  },
  {
    id: 'inc_020', code: 'INC-2026-0166', type: 'ELECTRICAL_HAZARD', status: 'REPORTED',
    severity: 'LOW', severity_score: 24,
    title: 'Downed Tree & Minor Branch Blockage — Kadi Road',
    location: { lng: 72.3300, lat: 23.0800 }, address: 'Kadi Highway, North Sanand', ward: 'Sanand North',
    report_count: 1, assigned_unit_count: 0, units_required: 1,
    has_conflict: false, has_pending_recommendation: false,
    occurred_at: minutesAgo(45), updated_at: minutesAgo(10), version: 2, is_simulated: true,
    description: 'Minor tree branch fallen onto outer service road shoulder. Traffic passing normally.',
    beliefs: [],
    severity_assessment: {
      severity: 'LOW', score: 24,
      factors: [], hard_rules_triggered: [], evidence_confidence: 0.90, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(10), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.91, suggested_type: 'ELECTRICAL_HAZARD', briefing: 'Minor obstruction on Kadi Rd.', degraded: false },
    required_capabilities: ['CROWD_CONTROL'], timeline_seq: 570,
  },
  {
    id: 'inc_021', code: 'INC-2026-0167', type: 'FLOOD', status: 'TRIAGED',
    severity: 'INFO', severity_score: 15,
    title: 'Canal Water Level Advisory — Kheda Sector',
    location: { lng: 72.5500, lat: 22.7500 }, address: 'Narmada Canal Bridge, Kheda Highway', ward: 'Kheda North',
    report_count: 1, assigned_unit_count: 0, units_required: 0,
    has_conflict: false, has_pending_recommendation: false,
    occurred_at: minutesAgo(60), updated_at: minutesAgo(20), version: 1, is_simulated: true,
    description: 'Routine water level monitoring advisory on canal bridge. No flooding or hazard detected.',
    beliefs: [],
    severity_assessment: {
      severity: 'INFO', score: 15,
      factors: [], hard_rules_triggered: [], evidence_confidence: 0.95, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(20), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.94, suggested_type: 'FLOOD', briefing: 'Precautionary canal survey advisory.', degraded: true },
    required_capabilities: [], timeline_seq: 580,
  },
  {
    id: 'inc_022', code: 'INC-2026-0168', type: 'ROAD_ACCIDENT', status: 'DISPATCHED',
    severity: 'HIGH', severity_score: 68,
    title: 'Rural Tractor Collision — Detroj Road',
    location: { lng: 72.1600, lat: 23.0300 }, address: 'Detroj-Viramgam State Highway', ward: 'Detroj Rural',
    report_count: 2, assigned_unit_count: 1, units_required: 1,
    has_conflict: false, has_pending_recommendation: false,
    occurred_at: minutesAgo(20), updated_at: minutesAgo(5), version: 3, is_simulated: true,
    description: 'Tractor trailer collision on rural state highway. Traffic restricted to single lane.',
    beliefs: [],
    severity_assessment: {
      severity: 'HIGH', score: 68,
      factors: [], hard_rules_triggered: [], evidence_confidence: 0.88, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(5), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.92, suggested_type: 'ROAD_ACCIDENT', briefing: 'Tractor crash on Detroj highway.', degraded: false },
    required_capabilities: ['MEDICAL_BASIC'], timeline_seq: 590,
  },
  {
    id: 'inc_023', code: 'INC-2026-0169', type: 'ELECTRICAL_HAZARD', status: 'REPORTED',
    severity: 'LOW', severity_score: 28,
    title: 'Agricultural Substation Sparking — Sachana Field',
    location: { lng: 72.2600, lat: 22.9600 }, address: 'Sachana Feeder Grid Road', ward: 'Sachana',
    report_count: 1, assigned_unit_count: 0, units_required: 1,
    has_conflict: false, has_pending_recommendation: false,
    occurred_at: minutesAgo(35), updated_at: minutesAgo(12), version: 2, is_simulated: true,
    description: 'Minor electrical transformer sparks reported by local farm operator. Power isolated.',
    beliefs: [],
    severity_assessment: {
      severity: 'LOW', score: 28,
      factors: [], hard_rules_triggered: [], evidence_confidence: 0.90, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(12), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.90, suggested_type: 'ELECTRICAL_HAZARD', briefing: 'Feeder transformer sparking at Sachana.', degraded: false },
    required_capabilities: ['POWER_ISOLATION'], timeline_seq: 600,
  },
  {
    id: 'inc_024', code: 'INC-2026-0170', type: 'ROAD_ACCIDENT', status: 'TRIAGED',
    severity: 'MODERATE', severity_score: 54,
    title: 'Highway Freight Breakdown — Gangad Junction',
    location: { lng: 72.3000, lat: 22.6400 }, address: 'Bagodara-Dholka State Highway, Gangad', ward: 'Gangad',
    report_count: 2, assigned_unit_count: 0, units_required: 1,
    has_conflict: false, has_pending_recommendation: true,
    occurred_at: minutesAgo(25), updated_at: minutesAgo(8), version: 2, is_simulated: true,
    description: 'Cargo lorry breakdown blocking one lane on Bagodara-Dholka highway.',
    beliefs: [],
    severity_assessment: {
      severity: 'MODERATE', score: 54,
      factors: [], hard_rules_triggered: [], evidence_confidence: 0.86, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(8), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.89, suggested_type: 'ROAD_ACCIDENT', briefing: 'Lorry breakdown at Gangad junction.', degraded: false },
    required_capabilities: ['CROWD_CONTROL'], timeline_seq: 610,
  },
  {
    id: 'inc_025', code: 'INC-2026-0171', type: 'FLOOD', status: 'REPORTED',
    severity: 'LOW', severity_score: 22,
    title: 'River Basin Water Advisory — Vataman Bridge',
    location: { lng: 72.4200, lat: 22.5800 }, address: 'Sabarmati Causeway, Vataman', ward: 'Vataman',
    report_count: 1, assigned_unit_count: 0, units_required: 0,
    has_conflict: false, has_pending_recommendation: false,
    occurred_at: minutesAgo(50), updated_at: minutesAgo(15), version: 1, is_simulated: true,
    description: 'Low-level water runoff advisory along Vataman river causeway. Traffic clear.',
    beliefs: [],
    severity_assessment: {
      severity: 'LOW', score: 22,
      factors: [], hard_rules_triggered: [], evidence_confidence: 0.92, confidence_note: null,
      counterfactuals: [], computed_at: minutesAgo(15), engine_version: 'sev-1.0', overridden_by: null,
    },
    evidence: [], assignments: [], links: [], ai: { classification_confidence: 0.93, suggested_type: 'FLOOD', briefing: 'Causeway runoff survey advisory.', degraded: true },
    required_capabilities: [], timeline_seq: 620,
  },
];

// ——— ALERTS ———
export const MOCK_ALERTS = [
  { id: 'alr_001', type: 'EVIDENCE_CONFLICT', severity: 'HIGH', incident_id: 'inc_001', unit_id: null, title: 'Contested: people_trapped', body: 'Citizen call says trapped, sensor HS-14 says no — send verification unit', payload: {}, raised_at: minutesAgo(12), acked_by: null, acked_at: null },
  { id: 'alr_002', type: 'NEW_CRITICAL', severity: 'CRITICAL', incident_id: 'inc_001', unit_id: null, title: 'New CRITICAL incident', body: 'INC-2026-0147 — Structure fire with trapped persons at Sabarmati Riverfront', payload: {}, raised_at: minutesAgo(17), acked_by: 'usr_002', acked_at: minutesAgo(16) },
  { id: 'alr_003', type: 'REALLOCATION_PROPOSED', severity: 'HIGH', incident_id: 'inc_001', unit_id: null, title: 'Reallocation recommended', body: 'INC-0147 needs 3 more units. 3 plans generated — review dispatch panel.', payload: {}, raised_at: minutesAgo(10), acked_by: null, acked_at: null },
  { id: 'alr_004', type: 'RESOURCE_SHORTAGE', severity: 'MODERATE', incident_id: 'inc_004', unit_id: null, title: 'No HAZMAT unit assigned', body: 'INC-2026-0150 requires HAZMAT_CONTAINMENT — HZ-01 is available', payload: {}, raised_at: minutesAgo(6), acked_by: null, acked_at: null },
  { id: 'alr_005', type: 'SLA_BREACH', severity: 'HIGH', incident_id: 'inc_005', unit_id: 'unt_002', title: 'SLA breach warning', body: 'A-02 ETA to INC-0151 exceeds 8-min SLA by 2:20', payload: {}, raised_at: minutesAgo(8), acked_by: null, acked_at: null },
];

// ——— CORRELATION CANDIDATES (dynamic generator for any incident) ———
export function generateMockCandidates(targetIncident, customIncidents = null) {
  if (!targetIncident) return [];
  const incidents = (customIncidents && customIncidents.length > 0) ? customIncidents : MOCK_INCIDENTS;

  const others = incidents.filter(i =>
    i.id !== targetIncident.id &&
    i.code !== targetIncident.code &&
    i.status !== 'MERGED' &&
    i.status !== 'CLOSED'
  );

  if (others.length === 0) return [];

  const c1 = others.find(i => i.type === targetIncident.type) || others[0];
  const c2 = others.find(i => i.id !== c1.id) || (others[1] || others[0]);

  const results = [
    {
      incident_id: c1.id,
      incident_code: c1.code || 'INC-2026-0148',
      title: c1.title || 'Structure fire nearby',
      band: 'DUPLICATE',
      score: 0.94,
      explanation: `Spatial proximity within 350m & 12 min window (${c1.type.replace(/_/g, ' ')})`,
    }
  ];

  if (c2 && c2.id !== c1.id) {
    results.push({
      incident_id: c2.id,
      incident_code: c2.code || 'INC-2026-0149',
      title: c2.title || 'Secondary hazard reported',
      band: 'LIKELY_SAME',
      score: 0.78,
      explanation: `Correlated via text embedding & vector similarity (${c2.type.replace(/_/g, ' ')})`,
    });
  }

  return results;
}

// ——— DISPATCH PLANS (dynamic generator for any incident) ———
export function generateMockDispatchPlans(incidentId, customIncidents = null, customUnits = null) {
  const incidents = customIncidents || MOCK_INCIDENTS;
  const units = customUnits || MOCK_UNITS;

  const incident = incidents.find(i => i.id === incidentId || i.code === incidentId) ||
    MOCK_INCIDENTS.find(i => i.id === incidentId || i.code === incidentId) ||
    MOCK_INCIDENTS[0];

  const caps = (incident.required_capabilities && incident.required_capabilities.length > 0)
    ? incident.required_capabilities
    : (incident.type === 'FLOOD' ? ['WATER_RESCUE', 'CROWD_CONTROL']
      : incident.type === 'FIRE_STRUCTURE' ? ['FIRE_SUPPRESSION', 'EXTRICATION']
      : incident.type === 'ROAD_ACCIDENT' ? ['EXTRICATION', 'MEDICAL_BASIC']
      : incident.type === 'GAS_LEAK' ? ['HAZMAT_CONTAINMENT', 'CROWD_CONTROL']
      : ['MEDICAL_BASIC', 'CROWD_CONTROL']);

  const pool = (units && units.length > 0) ? units : MOCK_UNITS;

  // Find candidate unit for each capability
  const selectedUnits = [];
  const usedUnitIds = new Set();

  for (const cap of caps) {
    const candidate = pool.find(u =>
      !usedUnitIds.has(u.id) &&
      (u.capabilities || []).includes(cap) &&
      u.status === 'AVAILABLE'
    ) || pool.find(u =>
      !usedUnitIds.has(u.id) &&
      (u.capabilities || []).includes(cap)
    ) || pool.find(u => !usedUnitIds.has(u.id) && u.status === 'AVAILABLE') || pool[0];

    if (candidate) {
      usedUnitIds.add(candidate.id);
      selectedUnits.push({ unit: candidate, cap });
    }
  }

  // Strategy 1: BALANCED
  const balancedMoves = selectedUnits.map(({ unit, cap }, idx) => ({
    unit_id: unit.id,
    unit_call_sign: unit.call_sign,
    from_incident_id: null,
    from_incident_code: null,
    eta_seconds: 240 + idx * 70,
    eta_method: 'ROAD_GRAPH',
    capability_match: (unit.capabilities || []).includes(cap) ? 1.0 : 0.5,
    preemption_regret: 0,
    impact_note: unit.status === 'AVAILABLE' ? 'Available — optimal sector route' : 'Assigned from adjacent sector',
  }));

  // Strategy 2: FASTEST_RESPONSE
  const fastestMoves = selectedUnits.map(({ unit, cap }, idx) => ({
    unit_id: unit.id,
    unit_call_sign: unit.call_sign,
    from_incident_id: null,
    from_incident_code: null,
    eta_seconds: 180 + idx * 50,
    eta_method: 'ROAD_GRAPH',
    capability_match: (unit.capabilities || []).includes(cap) ? 1.0 : 0.5,
    preemption_regret: idx > 0 ? 90 : 0,
    impact_note: 'Direct high-speed corridor routing',
  }));

  // Strategy 3: MINIMAL_DISRUPTION
  const minimalMoves = selectedUnits.slice(0, Math.max(1, selectedUnits.length - 1)).map(({ unit, cap }, idx) => ({
    unit_id: unit.id,
    unit_call_sign: unit.call_sign,
    from_incident_id: null,
    from_incident_code: null,
    eta_seconds: 320 + idx * 90,
    eta_method: 'ROAD_GRAPH',
    capability_match: 1.0,
    preemption_regret: 0,
    impact_note: 'Available unit from nearest base depot',
  }));

  const now = new Date();
  const expires = new Date(now.getTime() + 180000).toISOString();

  return [
    {
      id: `pln_${incident.id || 'inc'}_balanced`,
      incident_id: incident.id,
      strategy: 'BALANCED',
      total_cost: balancedMoves.reduce((s, m) => s + m.eta_seconds, 0),
      moves: balancedMoves,
      unmet_requirements: [],
      feasible: true,
      requires_preemption: false,
      generated_at: now.toISOString(),
      expires_at: expires,
    },
    {
      id: `pln_${incident.id || 'inc'}_fastest`,
      incident_id: incident.id,
      strategy: 'FASTEST_RESPONSE',
      total_cost: fastestMoves.reduce((s, m) => s + m.eta_seconds + m.preemption_regret, 0),
      moves: fastestMoves,
      unmet_requirements: [],
      feasible: true,
      requires_preemption: fastestMoves.some(m => m.preemption_regret > 0),
      generated_at: now.toISOString(),
      expires_at: expires,
    },
    {
      id: `pln_${incident.id || 'inc'}_disruption`,
      incident_id: incident.id,
      strategy: 'MINIMAL_DISRUPTION',
      total_cost: minimalMoves.reduce((s, m) => s + m.eta_seconds, 0) + (caps.length > minimalMoves.length ? 300 : 0),
      moves: minimalMoves,
      unmet_requirements: caps.length > minimalMoves.length ? [caps[caps.length - 1]] : [],
      feasible: caps.length <= minimalMoves.length,
      requires_preemption: false,
      generated_at: now.toISOString(),
      expires_at: expires,
    },
  ];
}

export const MOCK_DISPATCH_PLANS = generateMockDispatchPlans('inc_001');

// ——— ANALYTICS OVERVIEW ———
export const MOCK_ANALYTICS = {
  time_to_triage: { p50: 142, p90: 285 },
  time_to_dispatch: { p50: 68, p90: 180 },
  time_to_arrival: { p50: 420, p90: 680 },
  eta_accuracy: { mean_error: 45, p50_error: 32, p90_error: 120 },
  resource_utilization: 0.62,
  coverage_hole_minutes: 48,
  compression_ratio: 5.25,
  correlation_precision: 0.91,
  escalation_rate: 0.18,
  recommendation_acceptance: 0.78,
  model_operator_disagreement: 0.12,
  active_incidents: 6,
  total_reports_today: 42,
  units_available: 7,
  units_total: 14,
};
