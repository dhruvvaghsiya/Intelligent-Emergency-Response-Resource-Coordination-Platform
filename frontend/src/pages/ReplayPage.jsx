import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
  Rewind,
  FastForward,
  Flame,
  ShieldCheck,
  Activity,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Building2,
  Copy,
  Check,
  RotateCcw,
  Radio,
  Layers,
  MapPin,
  ChevronRight,
  SlidersHorizontal,
  Bot,
  Plus,
  GitCommit,
  Eye,
  Grid,
  X,
  Filter,
  ChevronDown
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { replayApi } from '../lib/api';
import { formatTime, formatDateTime } from '../lib/format';
import { useStore } from '../lib/store';

// Config for the 3 concurrent incident streams running in Ahmedabad
export const MULTI_INCIDENTS_CONFIG = {
  inc_naroda_01: {
    id: 'inc_naroda_01',
    title: 'Naroda Chemical Explosion & Hazmat Fire',
    shortTitle: 'Naroda Chemical Explosion',
    ward: 'Naroda GIDC Phase-II',
    severity: 'CRITICAL',
    severityScore: 94,
    badgeBg: 'bg-red-50',
    badgeText: 'text-red-700',
    badgeBorder: 'border-red-200',
    assignedUnits: ['FE-01', 'FL-01', 'A-07'],
  },
  inc_sghighway_02: {
    id: 'inc_sghighway_02',
    title: 'SG Highway Multi-Vehicle Pileup & Tanker Spill',
    shortTitle: 'SG Highway Pileup & Spill',
    ward: 'Thaltej / Bodakdev',
    severity: 'HIGH',
    severityScore: 78,
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-700',
    badgeBorder: 'border-orange-200',
    assignedUnits: ['FE-02', 'A-02', 'PL-01'],
  },
  inc_subhash_03: {
    id: 'inc_subhash_03',
    title: 'Subhash Bridge Underpass Bus Flood Rescue',
    shortTitle: 'Subhash Bridge Flood Rescue',
    ward: 'Sabarmati / Ranip',
    severity: 'MODERATE',
    severityScore: 64,
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    assignedUnits: ['WR-01', 'FE-03'],
  },
};

// 27 Interleaved multi-incident timeline events spanning 08:15:00 to 08:35:00
const DEMO_REPLAY_EVENTS = [
  // 1. 08:15:00 - Naroda Reported
  {
    event_id: 'evt_001',
    seq: 1,
    incident_id: 'inc_naroda_01',
    room: 'incidents',
    type: 'INCIDENT_REPORTED',
    category: 'incident',
    ts: '2026-09-20T08:15:00.000Z',
    entity: { kind: 'incident', id: 'inc_naroda_01' },
    actor: { kind: 'CITIZEN_APP', id: 'usr_8921', name: 'Citizen Caller #108' },
    summary: 'Industrial Chemical Explosion reported at Naroda GIDC Phase-II',
    payload: {
      incident_id: 'inc_naroda_01',
      title: 'Industrial Chemical Explosion & Structure Fire',
      ward: 'Naroda GIDC Phase-II',
      location: { lat: 23.0768, lng: 72.6644 },
      reported_severity: 'CRITICAL',
      initial_reports: 3,
      description: 'Massive chemical warehouse explosion near Godown 42. Dense toxic smoke plume, multiple workers trapped near rear chemical storage bay.',
      casualties_reported: 4,
      hazmat: 'Class 3 Flammable Solvents & Benzene derivatives',
    },
  },
  // 2. 08:15:12 - Naroda AI Triage
  {
    event_id: 'evt_002',
    seq: 2,
    incident_id: 'inc_naroda_01',
    room: 'ai',
    type: 'AI_TRIAGE_COMPLETED',
    category: 'ai',
    ts: '2026-09-20T08:15:12.000Z',
    entity: { kind: 'incident', id: 'inc_naroda_01' },
    actor: { kind: 'AI_ENGINE', id: 'groq-llama-3.3-70b', name: 'Groq Llama-3.3-70B Triage' },
    summary: 'AI computed Severity Score 94/100 (CRITICAL) · Evacuation radius 800m',
    payload: {
      incident_id: 'inc_naroda_01',
      severity_score: 94,
      severity_band: 'CRITICAL',
      confidence: 0.98,
      recommended_apparatus: ['FIRE_ENGINE', 'FIRE_LADDER', 'AMBULANCE_ALS', 'HAZMAT'],
      evacuation_radius_meters: 800,
      hazmat_protocol: 'P-HAZ-04 Toxic Vapor Suppression',
      urgency_index: 'SLA < 4 minutes',
      inferred_hazards: ['Toxic plume heading towards Nikol residential sector', 'Structural collapse probability 78%'],
    },
  },
  // 3. 08:15:35 - Naroda Dispatch Plan
  {
    event_id: 'evt_003',
    seq: 3,
    incident_id: 'inc_naroda_01',
    room: 'dispatch',
    type: 'DISPATCH_PLAN_GENERATED',
    category: 'dispatch',
    ts: '2026-09-20T08:15:35.000Z',
    entity: { kind: 'dispatch_plan', id: 'dp_8819' },
    actor: { kind: 'SYSTEM_OPTIMIZER', id: 'solver_v2', name: 'Multi-Criteria Dispatch Solver' },
    summary: 'Optimal response plan synthesized: FE-01, FL-01, A-07 (ETA 3m 30s)',
    payload: {
      plan_id: 'dp_8819',
      incident_id: 'inc_naroda_01',
      recommended_units: [
        { unit_id: 'FE-01', type: 'FIRE_ENGINE', eta_seconds: 180, station: 'Naroda Stn' },
        { unit_id: 'FL-01', type: 'FIRE_LADDER', eta_seconds: 240, station: 'Odhav Stn' },
        { unit_id: 'A-07', type: 'AMBULANCE_ALS', eta_seconds: 210, station: 'Civil Hospital Stn' },
      ],
      estimated_total_eta: '3m 30s',
      traffic_congestion_index: 'Low (0.24)',
      routing_advisory: 'Avoid Naroda NH-48 junction due to freight traffic',
    },
  },
  // 4. 08:15:58 - Naroda Operator Confirm
  {
    event_id: 'evt_004',
    seq: 4,
    incident_id: 'inc_naroda_01',
    room: 'dispatch',
    type: 'OPERATOR_DISPATCH_CONFIRMED',
    category: 'dispatch',
    ts: '2026-09-20T08:15:58.000Z',
    entity: { kind: 'assignment', id: 'asgn_9901' },
    actor: { kind: 'OPERATOR', id: 'disp_04', name: 'Commander R. Mehta (Station 1)' },
    summary: 'Operator confirmed 3 emergency apparatus with Priority-1 Hazmat protocol',
    payload: {
      incident_id: 'inc_naroda_01',
      assigned_units: ['FE-01', 'FL-01', 'A-07'],
      override_applied: false,
      dispatch_notes: 'Priority 1 Full Hazmat protocol authorized. Immediate water curtain deployment.',
    },
  },
  // 5. 08:16:20 - FE-01 En Route to Naroda
  {
    event_id: 'evt_005',
    seq: 5,
    incident_id: 'inc_naroda_01',
    room: 'units',
    type: 'UNIT_EN_ROUTE',
    category: 'units',
    ts: '2026-09-20T08:16:20.000Z',
    entity: { kind: 'unit', id: 'FE-01' },
    actor: { kind: 'FIELD_UNIT', id: 'FE-01', name: 'Engine FE-01 Crew' },
    summary: 'Fire Engine FE-01 en route to Naroda · Speed 62 km/h · ETA 2m 20s',
    payload: {
      unit_id: 'FE-01',
      call_sign: 'FE-01',
      status: 'EN_ROUTE',
      speed_kmh: 62,
      current_location: { lat: 23.0720, lng: 72.6580 },
      heading: 45,
      crew_count: 4,
      water_tank_liters: 4500,
      eta_live_seconds: 140,
    },
  },
  // 6. 08:16:30 - SG Highway Reported (NEW INCIDENT)
  {
    event_id: 'evt_006',
    seq: 6,
    incident_id: 'inc_sghighway_02',
    room: 'incidents',
    type: 'INCIDENT_REPORTED',
    category: 'incident',
    ts: '2026-09-20T08:16:30.000Z',
    entity: { kind: 'incident', id: 'inc_sghighway_02' },
    actor: { kind: 'IOT_SENSOR', id: 'cctv_pakwan_09', name: 'Traffic CCTV & Crash Sensor' },
    summary: '4-car collision with ruptured diesel tanker near SG Highway Pakwan Flyover',
    payload: {
      incident_id: 'inc_sghighway_02',
      title: 'SG Highway Multi-Vehicle Pileup & Tanker Spill',
      ward: 'Thaltej / Bodakdev',
      location: { lat: 23.0360, lng: 72.5110 },
      reported_severity: 'HIGH',
      casualties_reported: 3,
      road_blocked: 'Northbound flyover ramp completely blocked',
      hazmat: 'Diesel fuel leaking across 40m carriageway',
    },
  },
  // 7. 08:16:42 - SG Highway AI Triage
  {
    event_id: 'evt_007',
    seq: 7,
    incident_id: 'inc_sghighway_02',
    room: 'ai',
    type: 'AI_TRIAGE_COMPLETED',
    category: 'ai',
    ts: '2026-09-20T08:16:42.000Z',
    entity: { kind: 'incident', id: 'inc_sghighway_02' },
    actor: { kind: 'AI_ENGINE', id: 'groq-llama-3.3-70b', name: 'Groq Llama-3.3-70B Triage' },
    summary: 'AI scored SG Highway crash Severity 78/100 · Fire spread & ignition risk detected',
    payload: {
      incident_id: 'inc_sghighway_02',
      severity_score: 78,
      severity_band: 'HIGH',
      confidence: 0.96,
      recommended_apparatus: ['FIRE_ENGINE', 'AMBULANCE_BLS', 'POLICE_PATROL'],
      inferred_hazards: ['Diesel vapor ignition risk from running engines', 'Severe highway gridlock forming'],
    },
  },
  // 8. 08:16:45 - A-07 En Route to Naroda
  {
    event_id: 'evt_008',
    seq: 8,
    incident_id: 'inc_naroda_01',
    room: 'units',
    type: 'UNIT_EN_ROUTE',
    category: 'units',
    ts: '2026-09-20T08:16:45.000Z',
    entity: { kind: 'unit', id: 'A-07' },
    actor: { kind: 'FIELD_UNIT', id: 'A-07', name: 'Ambulance ALS A-07 Crew' },
    summary: 'Advanced Ambulance A-07 en route to Naroda with onboard burn resuscitation kit',
    payload: {
      unit_id: 'A-07',
      call_sign: 'A-07',
      status: 'EN_ROUTE',
      speed_kmh: 58,
      paramedic_count: 3,
      icu_equipment_online: true,
      eta_live_seconds: 165,
    },
  },
  // 9. 08:17:05 - SG Highway Dispatch Plan
  {
    event_id: 'evt_009',
    seq: 9,
    incident_id: 'inc_sghighway_02',
    room: 'dispatch',
    type: 'DISPATCH_PLAN_GENERATED',
    category: 'dispatch',
    ts: '2026-09-20T08:17:05.000Z',
    entity: { kind: 'dispatch_plan', id: 'dp_8820' },
    actor: { kind: 'SYSTEM_OPTIMIZER', id: 'solver_v2', name: 'Multi-Criteria Dispatch Solver' },
    summary: 'Plan generated for SG Highway: FE-02, A-02, PL-01 with lane diversion protocol',
    payload: {
      plan_id: 'dp_8820',
      incident_id: 'inc_sghighway_02',
      recommended_units: [
        { unit_id: 'FE-02', type: 'FIRE_ENGINE', eta_seconds: 190, station: 'Thaltej Fire Stn' },
        { unit_id: 'A-02', type: 'AMBULANCE_BLS', eta_seconds: 220, station: 'Bodakdev Medical Post' },
        { unit_id: 'PL-01', type: 'POLICE_PATROL', eta_seconds: 120, station: 'Vastrapur Traffic Sector' },
      ],
      estimated_total_eta: '3m 10s',
    },
  },
  // 10. 08:17:25 - SG Highway Operator Confirm
  {
    event_id: 'evt_010',
    seq: 10,
    incident_id: 'inc_sghighway_02',
    room: 'dispatch',
    type: 'OPERATOR_DISPATCH_CONFIRMED',
    category: 'dispatch',
    ts: '2026-09-20T08:17:25.000Z',
    entity: { kind: 'assignment', id: 'asgn_9902' },
    actor: { kind: 'OPERATOR', id: 'disp_07', name: 'Dispatcher J. Trivedi' },
    summary: 'Operator confirmed dispatch & alerted Zydus Hospital Emergency Trauma Wing',
    payload: {
      incident_id: 'inc_sghighway_02',
      assigned_units: ['FE-02', 'A-02', 'PL-01'],
      notes: 'Establish immediate traffic perimeter and blanket diesel spill with dry chemical powder.',
    },
  },
  // 11. 08:17:30 - Hospital Beds Reserved for Naroda
  {
    event_id: 'evt_011',
    seq: 11,
    incident_id: 'inc_naroda_01',
    room: 'hospital',
    type: 'HOSPITAL_BEDS_RESERVED',
    category: 'hospital',
    ts: '2026-09-20T08:17:30.000Z',
    entity: { kind: 'hospital', id: 'hosp_civil_01' },
    actor: { kind: 'SYSTEM_ROUTER', id: 'bed_allocator', name: 'Regional Trauma Bed Router' },
    summary: '4 ICU Trauma & Burn beds pre-reserved at Ahmedabad Civil Hospital',
    payload: {
      hospital_name: 'Ahmedabad Civil Hospital Trauma Center',
      reserved_icu_beds: 4,
      burn_unit_alerted: true,
      triage_bay_ready: 'Bay 1 & Bay 2',
      distance_km: 4.8,
    },
  },
  // 12. 08:18:00 - Units En Route to SG Highway
  {
    event_id: 'evt_012',
    seq: 12,
    incident_id: 'inc_sghighway_02',
    room: 'units',
    type: 'UNIT_EN_ROUTE',
    category: 'units',
    ts: '2026-09-20T08:18:00.000Z',
    entity: { kind: 'unit', id: 'FE-02' },
    actor: { kind: 'FIELD_UNIT', id: 'FE-02', name: 'Fire Engine FE-02 Crew' },
    summary: 'Engine FE-02 and Ambulance A-02 en route to SG Highway · ETA 1m 50s',
    payload: {
      unit_id: 'FE-02',
      call_sign: 'FE-02',
      status: 'EN_ROUTE',
      speed_kmh: 66,
      foam_concentrate_liters: 800,
    },
  },
  // 13. 08:18:15 - Subhash Bridge Reported (3RD CONCURRENT INCIDENT)
  {
    event_id: 'evt_013',
    seq: 13,
    incident_id: 'inc_subhash_03',
    room: 'incidents',
    type: 'INCIDENT_REPORTED',
    category: 'incident',
    ts: '2026-09-20T08:18:15.000Z',
    entity: { kind: 'incident', id: 'inc_subhash_03' },
    actor: { kind: 'OPERATOR_MANUAL', id: 'transit_police_03', name: 'AMTS Control Desk' },
    summary: 'AMTS City Bus stalled in 3.5ft waterlogging under Subhash Bridge with 15 passengers',
    payload: {
      incident_id: 'inc_subhash_03',
      title: 'Subhash Bridge Underpass Bus Flood Rescue',
      ward: 'Sabarmati / Ranip',
      location: { lat: 23.0540, lng: 72.5830 },
      reported_severity: 'MODERATE',
      stranded_passengers: 15,
      water_depth_ft: 3.5,
      description: 'Rapid stormwater buildup trapped municipal city bus. Water entering passenger cabin floor.',
    },
  },
  // 14. 08:18:30 - Subhash Bridge AI Triage
  {
    event_id: 'evt_014',
    seq: 14,
    incident_id: 'inc_subhash_03',
    room: 'ai',
    type: 'AI_TRIAGE_COMPLETED',
    category: 'ai',
    ts: '2026-09-20T08:18:30.000Z',
    entity: { kind: 'incident', id: 'inc_subhash_03' },
    actor: { kind: 'AI_ENGINE', id: 'groq-llama-3.3-70b', name: 'Groq Llama-3.3-70B Triage' },
    summary: 'AI scored Subhash Bridge Flood Severity 64/100 · Dispatched Inflatable Rescue Boat',
    payload: {
      incident_id: 'inc_subhash_03',
      severity_score: 64,
      severity_band: 'MODERATE',
      confidence: 0.95,
      recommended_apparatus: ['WATER_RESCUE', 'FIRE_ENGINE'],
      water_rescue_protocol: 'P-WTR-02 Submerged Vehicle Evacuation',
    },
  },
  // 15. 08:18:40 - FE-01 Arrives on Scene at Naroda
  {
    event_id: 'evt_015',
    seq: 15,
    incident_id: 'inc_naroda_01',
    room: 'units',
    type: 'UNIT_ARRIVED_ON_SCENE',
    category: 'units',
    ts: '2026-09-20T08:18:40.000Z',
    entity: { kind: 'unit', id: 'FE-01' },
    actor: { kind: 'FIELD_UNIT', id: 'FE-01', name: 'Capt. Patel (FE-01)' },
    summary: 'First responder FE-01 arrived at Naroda Chemical Plant · Response latency 3m 40s (SLA Met)',
    payload: {
      unit_id: 'FE-01',
      status: 'ON_SCENE',
      actual_response_time_seconds: 220,
      sla_met: true,
      scene_report: 'Heavy black smoke, chemical drums ruptured on south dock. Deploying master foam stream.',
    },
  },
  // 16. 08:19:00 - Subhash Bridge Dispatch Plan
  {
    event_id: 'evt_016',
    seq: 16,
    incident_id: 'inc_subhash_03',
    room: 'dispatch',
    type: 'DISPATCH_PLAN_GENERATED',
    category: 'dispatch',
    ts: '2026-09-20T08:19:00.000Z',
    entity: { kind: 'dispatch_plan', id: 'dp_8821' },
    actor: { kind: 'SYSTEM_OPTIMIZER', id: 'solver_v2', name: 'Multi-Criteria Dispatch Solver' },
    summary: 'Plan generated for Subhash Bridge: WR-01 (Zodiac rescue craft) + FE-03 (Dewatering Pump)',
    payload: {
      plan_id: 'dp_8821',
      incident_id: 'inc_subhash_03',
      recommended_units: [
        { unit_id: 'WR-01', type: 'WATER_RESCUE', eta_seconds: 195, station: 'Sabarmati Riverfront Stn' },
        { unit_id: 'FE-03', type: 'FIRE_ENGINE', eta_seconds: 230, station: 'Shahpur Fire Stn' },
      ],
      estimated_total_eta: '3m 15s',
    },
  },
  // 17. 08:19:15 - A-07 Arrives on Scene at Naroda
  {
    event_id: 'evt_017',
    seq: 17,
    incident_id: 'inc_naroda_01',
    room: 'units',
    type: 'UNIT_ARRIVED_ON_SCENE',
    category: 'units',
    ts: '2026-09-20T08:19:15.000Z',
    entity: { kind: 'unit', id: 'A-07' },
    actor: { kind: 'FIELD_UNIT', id: 'A-07', name: 'Paramedic Lead (A-07)' },
    summary: 'Ambulance A-07 established field triage at Naroda · 2 casualties stabilized',
    payload: {
      unit_id: 'A-07',
      status: 'ON_SCENE',
      triage_point_established: 'North Gate Assembly Zone',
      casualties_received: 2,
      critical_stability_status: 'Stabilizing with high-flow oxygen & burn dressings',
    },
  },
  // 18. 08:19:40 - Subhash Bridge Operator Confirm
  {
    event_id: 'evt_018',
    seq: 18,
    incident_id: 'inc_subhash_03',
    room: 'dispatch',
    type: 'OPERATOR_DISPATCH_CONFIRMED',
    category: 'dispatch',
    ts: '2026-09-20T08:19:40.000Z',
    entity: { kind: 'assignment', id: 'asgn_9903' },
    actor: { kind: 'OPERATOR', id: 'disp_04', name: 'Commander R. Mehta' },
    summary: 'Dispatched WR-01 Zodiac craft & high-volume dewatering pumps to Subhash Underpass',
    payload: {
      incident_id: 'inc_subhash_03',
      assigned_units: ['WR-01', 'FE-03'],
      notes: 'Priority passenger evacuation before bus electrical short-circuit risk occurs.',
    },
  },
  // 19. 08:20:10 - PL-01 & FE-02 Arrive on Scene at SG Highway
  {
    event_id: 'evt_019',
    seq: 19,
    incident_id: 'inc_sghighway_02',
    room: 'units',
    type: 'UNIT_ARRIVED_ON_SCENE',
    category: 'units',
    ts: '2026-09-20T08:20:10.000Z',
    entity: { kind: 'unit', id: 'FE-02' },
    actor: { kind: 'FIELD_UNIT', id: 'FE-02', name: 'Crew FE-02' },
    summary: 'Responders arrived on scene at SG Highway · Perimeter secured, foam barrier laid',
    payload: {
      unit_id: 'FE-02',
      status: 'ON_SCENE',
      scene_report: 'Carriageway closed, applying heavy foam blanket over 40m diesel spill',
      traffic_rerouted: true,
    },
  },
  // 20. 08:21:00 - Secondary Report Merged into Naroda
  {
    event_id: 'evt_020',
    seq: 20,
    incident_id: 'inc_naroda_01',
    room: 'incidents',
    type: 'SECONDARY_INCIDENT_MERGED',
    category: 'ai',
    ts: '2026-09-20T08:21:00.000Z',
    entity: { kind: 'incident', id: 'inc_naroda_01' },
    actor: { kind: 'AI_DEDUP_ENGINE', id: 'minilm_v2', name: 'MiniLM-L6 Embedding Engine' },
    summary: 'MiniLM AI merged 4 duplicate citizen alerts for Naroda (94% spatial & semantic match)',
    payload: {
      merged_report_id: 'rep_99182',
      caller_text: 'Chemical factory on fire near Naroda railway track, huge dark toxic smoke',
      similarity_score: 0.94,
      action: 'Merged into primary incident INC-NARODA-01',
    },
  },
  // 21. 08:22:15 - Water Rescue WR-01 Arrives at Subhash Bridge
  {
    event_id: 'evt_021',
    seq: 21,
    incident_id: 'inc_subhash_03',
    room: 'units',
    type: 'UNIT_ARRIVED_ON_SCENE',
    category: 'units',
    ts: '2026-09-20T08:22:15.000Z',
    entity: { kind: 'unit', id: 'WR-01' },
    actor: { kind: 'FIELD_UNIT', id: 'WR-01', name: 'Water Rescue WR-01' },
    summary: 'Zodiac inflatable boat deployed to bus door at Subhash Underpass · Commenced boarding',
    payload: {
      unit_id: 'WR-01',
      status: 'ON_SCENE',
      boat_deployed: true,
      life_jackets_distributed: 15,
      evacuation_in_progress: true,
    },
  },
  // 22. 08:23:45 - SG Highway Casualties Evacuated
  {
    event_id: 'evt_022',
    seq: 22,
    incident_id: 'inc_sghighway_02',
    room: 'units',
    type: 'CASUALTIES_EVACUATED',
    category: 'units',
    ts: '2026-09-20T08:23:45.000Z',
    entity: { kind: 'unit', id: 'A-02' },
    actor: { kind: 'FIELD_UNIT', id: 'A-02', name: 'Ambulance A-02 Crew' },
    summary: '3 injured motorists extracted and en route to Zydus Hospital with non-life-threatening trauma',
    payload: {
      unit_id: 'A-02',
      status: 'EN_ROUTE_HOSPITAL',
      casualties_transported: 3,
      destination_hospital: 'Zydus Hospital SG Highway',
      eta_hospital_minutes: 4,
    },
  },
  // 23. 08:25:30 - Subhash Bridge Passengers Rescued
  {
    event_id: 'evt_023',
    seq: 23,
    incident_id: 'inc_subhash_03',
    room: 'incidents',
    type: 'PASSENGERS_RESCUED',
    category: 'incident',
    ts: '2026-09-20T08:25:30.000Z',
    entity: { kind: 'incident', id: 'inc_subhash_03' },
    actor: { kind: 'FIELD_UNIT', id: 'WR-01', name: 'Water Rescue Lead' },
    summary: 'All 15 passengers successfully ferried to dry railway approach ramp · Zero casualties',
    payload: {
      incident_id: 'inc_subhash_03',
      passengers_evacuated: 15,
      injuries: 0,
      bus_driver_accounted_for: true,
      dewatering_pumps_active: true,
      discharge_rate_lpm: 12000,
    },
  },
  // 24. 08:27:00 - Naroda Fire Contained
  {
    event_id: 'evt_024',
    seq: 24,
    incident_id: 'inc_naroda_01',
    room: 'incidents',
    type: 'INCIDENT_CONTAINED',
    category: 'incident',
    ts: '2026-09-20T08:27:00.000Z',
    entity: { kind: 'incident', id: 'inc_naroda_01' },
    actor: { kind: 'OPERATOR', id: 'disp_04', name: 'Commander R. Mehta' },
    summary: 'Major chemical blaze at Naroda contained · Vapor scrubbers operational · 4 casualties evacuated',
    payload: {
      incident_id: 'inc_naroda_01',
      status: 'CONTAINED',
      hazard_suppression_percent: 88,
      casualties_evacuated: 4,
      zero_fatalities: true,
      air_quality_sensor_ppm: 'Returned below threshold (12 ppm)',
    },
  },
  // 25. 08:29:10 - SG Highway Contained & Reopened
  {
    event_id: 'evt_025',
    seq: 25,
    incident_id: 'inc_sghighway_02',
    room: 'incidents',
    type: 'INCIDENT_CONTAINED',
    category: 'incident',
    ts: '2026-09-20T08:29:10.000Z',
    entity: { kind: 'incident', id: 'inc_sghighway_02' },
    actor: { kind: 'FIELD_UNIT', id: 'PL-01', name: 'Traffic Inspector S. Rathore' },
    summary: 'Diesel slick absorbed and wreckage pushed to shoulder · SG Highway northbound reopened',
    payload: {
      incident_id: 'inc_sghighway_02',
      status: 'CONTAINED',
      highway_lanes_open: '2 of 3 open for traffic',
      hazard_neutralized: true,
    },
  },
  // 26. 08:31:00 - Subhash Bridge Resolved
  {
    event_id: 'evt_026',
    seq: 26,
    incident_id: 'inc_subhash_03',
    room: 'incidents',
    type: 'INCIDENT_RESOLVED',
    category: 'incident',
    ts: '2026-09-20T08:31:00.000Z',
    entity: { kind: 'incident', id: 'inc_subhash_03' },
    actor: { kind: 'SYSTEM', id: 'drainage_controller', name: 'Smart Urban Drainage Node' },
    summary: 'Subhash Underpass floodwaters drained below 6 inches · Tow truck retrieved stalled bus',
    payload: {
      incident_id: 'inc_subhash_03',
      status: 'RESOLVED',
      water_level_inches: 4,
      bus_towed: true,
      underpass_reopened_to_traffic: true,
    },
  },
  // 27. 08:35:00 - Naroda Incident Resolved & Audited
  {
    event_id: 'evt_027',
    seq: 27,
    incident_id: 'inc_naroda_01',
    room: 'incidents',
    type: 'INCIDENT_RESOLVED',
    category: 'incident',
    ts: '2026-09-20T08:35:00.000Z',
    entity: { kind: 'incident', id: 'inc_naroda_01' },
    actor: { kind: 'SYSTEM', id: 'closure_daemon', name: 'Automated Post-Incident Auditor' },
    summary: 'Naroda incident closed with cryptographic audit trail · All units returned to Available status',
    payload: {
      incident_id: 'inc_naroda_01',
      status: 'RESOLVED',
      total_duration_minutes: 20,
      units_reassigned: ['FE-01', 'FL-01', 'A-07'],
      post_incident_log_generated: true,
      audit_integrity_hash: 'SHA256-e8f9a2c3019b4f8d99c42a',
    },
  },
];

const CATEGORY_COLORS = {
  incident: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: Flame },
  ai: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: Sparkles },
  dispatch: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Activity },
  units: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: Truck },
  hospital: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Building2 },
};

export function ReplayPage() {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [position, setPosition] = useState(0); // 0-100 percentage
  const [selectedIncidentFilters, setSelectedIncidentFilters] = useState([]); // [] = all
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState([]); // [] = all
  const [quickFilter, setQuickFilter] = useState('all'); // 'all' | 'latest5' | 'critical' | 'recent'
  const [inspectorTab, setInspectorTab] = useState('focus'); // 'focus' | 'citywide'
  const [copied, setCopied] = useState(false);
  const [scenarioMode, setScenarioMode] = useState('demo'); // 'demo' | 'live'
  const [customEvents, setCustomEvents] = useState([]);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [incidentDropdownOpen, setIncidentDropdownOpen] = useState(false);
  const incidentDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (incidentDropdownRef.current && !incidentDropdownRef.current.contains(e.target)) {
        setIncidentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderSeverityBadge = (severity) => {
    const sev = (severity || 'INFO').toUpperCase();
    let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300';
    if (sev === 'CRITICAL') badgeStyle = 'bg-red-100 text-red-700 border-red-300 shadow-2xs';
    else if (sev === 'HIGH') badgeStyle = 'bg-amber-100 text-amber-800 border-amber-300 shadow-2xs';
    else if (sev === 'MODERATE') badgeStyle = 'bg-blue-100 text-blue-700 border-blue-300 shadow-2xs';
    else if (sev === 'LOW') badgeStyle = 'bg-emerald-100 text-emerald-700 border-emerald-300 shadow-2xs';

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide border ${badgeStyle}`}>
        {sev}
      </span>
    );
  };

  // Refs to always hold latest speed/playing for the interval (avoids stale closures)
  const speedRef = useRef(1);
  const playingRef = useRef(false);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  const toggleIncidentFilter = (id) => {
    if (id === 'ALL') {
      setSelectedIncidentFilters([]);
      return;
    }
    setSelectedIncidentFilters(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const toggleCategoryFilter = (cat) => {
    if (cat === 'ALL') {
      setSelectedCategoryFilters([]);
      return;
    }
    setSelectedCategoryFilters(prev => {
      if (prev.includes(cat)) {
        return prev.filter(x => x !== cat);
      } else {
        return [...prev, cat];
      }
    });
  };

  // New custom event form state
  const [newIncidentId, setNewIncidentId] = useState('inc_naroda_01');
  const [newEventType, setNewEventType] = useState('INCIDENT_ESCALATED');
  const [newEventCategory, setNewEventCategory] = useState('incident');
  const [newEventActor, setNewEventActor] = useState('Commander R. Mehta');
  const [newEventSummary, setNewEventSummary] = useState('');

  const timelineListRef = useRef(null);
  const storeIncidents = useStore(s => s.incidents);
  const liveTimelineEvents = useStore(s => s.timelineEvents);
  const syncReportedFromStorage = useStore(s => s.syncReportedFromStorage);

  useEffect(() => {
    if (syncReportedFromStorage) syncReportedFromStorage();
    const handleStorage = (e) => {
      if (e.key === 'resilio.reported_incidents' || e.key === 'resilio.reported_timeline_events') {
        if (syncReportedFromStorage) syncReportedFromStorage();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [syncReportedFromStorage]);

  const { data: liveData } = useQuery({
    queryKey: ['replay'],
    queryFn: () => replayApi.list({ limit: 2000 }),
    refetchInterval: scenarioMode === 'live' ? 10000 : false,
  });

  // Dynamically include reported incidents alongside demo incidents
  const incidentsConfig = useMemo(() => {
    const config = { ...MULTI_INCIDENTS_CONFIG };
    (storeIncidents || []).forEach((inc) => {
      if (!config[inc.id]) {
        const severity = inc.priority || inc.severity || (inc.severity_score > 70 ? 'CRITICAL' : inc.severity_score > 40 ? 'HIGH' : 'MODERATE');
        const badgeBg = severity === 'CRITICAL' ? 'bg-red-50' : severity === 'HIGH' ? 'bg-orange-50' : 'bg-blue-50';
        const badgeText = severity === 'CRITICAL' ? 'text-red-700' : severity === 'HIGH' ? 'text-orange-700' : 'text-blue-700';
        const badgeBorder = severity === 'CRITICAL' ? 'border-red-200' : severity === 'HIGH' ? 'border-orange-200' : 'border-blue-200';
        config[inc.id] = {
          id: inc.id,
          title: inc.title || `${inc.type || 'Incident'} (${inc.code || inc.id})`,
          shortTitle: inc.code || inc.title?.slice(0, 20) || 'Citizen Report',
          ward: inc.ward || (inc.location ? `${Number(inc.location.lat).toFixed(3)}, ${Number(inc.location.lng).toFixed(3)}` : 'Ahmedabad Central'),
          severity,
          severityScore: inc.severity_score || 75,
          badgeBg,
          badgeText,
          badgeBorder,
          assignedUnits: (inc.assignments || []).map((a) => a.unit_call_sign || a.unit_id),
        };
      }
    });
    return config;
  }, [storeIncidents]);

  const rawEvents = useMemo(() => {
    const base = (scenarioMode === 'live' && liveData?.data?.length > 0)
      ? liveData.data
      : DEMO_REPLAY_EVENTS;

    // Convert real reported incidents into timeline events ONLY if not already present
    const reportedIncidentEvents = [];
    (storeIncidents || []).forEach((inc) => {
      if (['inc_naroda_01', 'inc_sghighway_02', 'inc_subhash_03'].includes(inc.id)) return;

      const alreadyInLiveTimeline = (liveTimelineEvents || []).some(
        e => e.incident_id === inc.id || e.payload?.incident_id === inc.id
      );
      const alreadyInBase = (base || []).some(
        e => e.incident_id === inc.id || e.payload?.incident_id === inc.id
      );

      if (!alreadyInLiveTimeline && !alreadyInBase) {
        const reportTime = inc.reported_at || inc.occurred_at || new Date().toISOString();
        reportedIncidentEvents.push({
          event_id: `evt_rep_${inc.id}`,
          seq: 900,
          incident_id: inc.id,
          room: 'incidents',
          type: 'INCIDENT_REPORTED',
          category: 'incident',
          ts: reportTime,
          entity: { kind: 'incident', id: inc.id },
          actor: { kind: 'CITIZEN_APP', name: inc.reports?.[0]?.source_label || 'Citizen Report' },
          summary: `Citizen Emergency Report: ${inc.description || inc.title}`,
          payload: {
            incident_id: inc.id,
            code: inc.code,
            type: inc.type,
            description: inc.description,
            location: inc.location,
            status: inc.status || 'INGESTED',
          },
        });

        reportedIncidentEvents.push({
          event_id: `evt_triage_${inc.id}`,
          seq: 901,
          incident_id: inc.id,
          room: 'incidents',
          type: 'AI_TRIAGE_COMPLETE',
          category: 'ai',
          ts: new Date(new Date(reportTime).getTime() + 15000).toISOString(),
          entity: { kind: 'incident', id: inc.id },
          actor: { kind: 'AI_AGENT', name: 'Llama-3.3-70B Ingest Core' },
          summary: `AI Belief Fusion: Severity ${inc.priority || 'HIGH'} (${inc.severity_score || 75}/100)`,
          payload: {
            incident_id: inc.id,
            severity: inc.priority || 'HIGH',
            score: inc.severity_score || 75,
            required_capabilities: inc.required_capabilities,
          },
        });
      }
    });

    const all = [...base, ...customEvents, ...(liveTimelineEvents || []), ...reportedIncidentEvents];
    
    // Semantic deduplication: ensure each incident has at most 1 reporting event and at most 1 AI triage event
    const seenIncidentReport = new Set();
    const seenIncidentTriage = new Set();
    const seenEventId = new Set();
    const unique = [];

    for (const evt of all) {
      if (seenEventId.has(evt.event_id)) continue;
      seenEventId.add(evt.event_id);

      const incId = evt.incident_id || evt.payload?.incident_id;
      const isReport = evt.type === 'INCIDENT_REPORTED' || evt.type === 'report.ingested' || evt.type === 'report.received';
      const isTriage = evt.type === 'AI_TRIAGE_COMPLETED' || evt.type === 'AI_TRIAGE_COMPLETE' || evt.type === 'ai.triage';

      if (isReport && incId) {
        if (seenIncidentReport.has(incId)) continue;
        seenIncidentReport.add(incId);
      }
      if (isTriage && incId) {
        if (seenIncidentTriage.has(incId)) continue;
        seenIncidentTriage.add(incId);
      }

      unique.push(evt);
    }

    return unique.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  }, [scenarioMode, liveData, customEvents, storeIncidents, liveTimelineEvents]);

  // Enrich events with category and incident if missing
  const events = useMemo(() => {
    return rawEvents.map((e, idx) => {
      let cat = e.category;
      if (!cat) {
        if (e.type.includes('INCIDENT') || e.type.includes('RESCUED') || e.type.includes('EVACUATED')) cat = 'incident';
        else if (e.type.includes('AI') || e.type.includes('TRIAGE') || e.type.includes('MERGED')) cat = 'ai';
        else if (e.type.includes('DISPATCH') || e.type.includes('ASSIGN')) cat = 'dispatch';
        else if (e.type.includes('UNIT')) cat = 'units';
        else if (e.type.includes('HOSPITAL') || e.type.includes('BED')) cat = 'hospital';
        else cat = 'dispatch';
      }
      const incId = e.incident_id || e.payload?.incident_id || 'inc_naroda_01';
      return { ...e, category: cat, incident_id: incId, index: idx };
    });
  }, [rawEvents]);

  const startTime = useMemo(() => {
    return events.length ? new Date(events[0].ts) : new Date(Date.now() - 3600000);
  }, [events]);

  const endTime = useMemo(() => {
    return events.length ? new Date(events[events.length - 1].ts) : new Date();
  }, [events]);

  const totalDurationMs = Math.max(1000, endTime.getTime() - startTime.getTime());
  const currentTime = new Date(startTime.getTime() + (totalDurationMs * position) / 100);

  // Filter events based on active incident, category filters + quick filter preset
  const filteredEvents = useMemo(() => {
    let base = events.filter(e => {
      const matchInc = selectedIncidentFilters.length === 0 || selectedIncidentFilters.includes(e.incident_id);
      const matchCat = selectedCategoryFilters.length === 0 || selectedCategoryFilters.includes(e.category);
      return matchInc && matchCat;
    });

    if (quickFilter === 'latest5') {
      // Show events from the 5 most-recently-started incident IDs
      const incidentOrder = [...new Map(
        [...events].reverse().map(e => [e.incident_id, e.incident_id])
      ).values()].slice(0, 5);
      base = base.filter(e => incidentOrder.includes(e.incident_id));
    } else if (quickFilter === 'critical') {
      // Show only events belonging to CRITICAL incidents
      const criticalIds = Object.entries(incidentsConfig)
        .filter(([, conf]) => conf.severity === 'CRITICAL')
        .map(([id]) => id);
      base = base.filter(e => criticalIds.includes(e.incident_id));
    } else if (quickFilter === 'recent') {
      // Show events within ±5 minutes of current scrubber time
      const windowMs = 5 * 60 * 1000;
      const t = currentTime.getTime();
      base = base.filter(e => Math.abs(new Date(e.ts).getTime() - t) <= windowMs);
    }

    return base;
  }, [events, selectedIncidentFilters, selectedCategoryFilters, quickFilter, incidentsConfig, currentTime]);

  // Find nearest event to current time
  const nearestEventIndex = useMemo(() => {
    if (!events.length) return 0;
    const t = currentTime.getTime();
    let bestIdx = 0;
    let bestDiff = Infinity;
    events.forEach((e, idx) => {
      const diff = Math.abs(new Date(e.ts).getTime() - t);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = idx;
      }
    });
    return bestIdx;
  }, [events, currentTime]);

  const activeEvent = events[nearestEventIndex] || events[0];

  // Compute live operational status for each of the incidents at `currentTime`
  const incidentStatuses = useMemo(() => {
    const statuses = {};
    Object.keys(incidentsConfig).forEach(incId => {
      const incEvents = events.filter(e => e.incident_id === incId);
      const passedEvents = incEvents.filter(e => new Date(e.ts).getTime() <= currentTime.getTime());
      
      if (passedEvents.length === 0) {
        statuses[incId] = {
          state: 'PENDING',
          badge: 'bg-slate-100 text-slate-600 border-slate-200',
          label: 'Not Started',
          activeUnits: [],
          eventCount: incEvents.length,
          lastEvent: null,
        };
      } else {
        const last = passedEvents[passedEvents.length - 1];
        let state = 'ACTIVE';
        let badge = 'bg-blue-50 text-blue-700 border-blue-200';
        let label = 'In Progress';

        if (last.type === 'INCIDENT_RESOLVED') {
          state = 'RESOLVED';
          badge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
          label = 'Resolved & Audited';
        } else if (last.type === 'INCIDENT_CONTAINED') {
          state = 'CONTAINED';
          badge = 'bg-teal-50 text-teal-700 border-teal-200';
          label = 'Blaze/Spill Contained';
        } else if (last.type === 'PASSENGERS_RESCUED' || last.type === 'CASUALTIES_EVACUATED') {
          state = 'EVACUATING';
          badge = 'bg-amber-50 text-amber-700 border-amber-200';
          label = 'Casualties Evacuating';
        } else if (last.type.includes('ARRIVED') || last.type.includes('ON_SCENE')) {
          state = 'ON_SCENE';
          badge = 'bg-red-50 text-red-700 border-red-200';
          label = 'On Scene Operations';
        } else if (last.type.includes('EN_ROUTE')) {
          state = 'EN_ROUTE';
          badge = 'bg-indigo-50 text-indigo-700 border-indigo-200';
          label = 'Units En Route';
        } else if (last.type.includes('DISPATCH')) {
          state = 'DISPATCHED';
          badge = 'bg-purple-50 text-purple-700 border-purple-200';
          label = 'Dispatch Confirmed';
        } else if (last.type.includes('TRIAGE')) {
          state = 'TRIAGED';
          badge = 'bg-orange-50 text-orange-700 border-orange-200';
          label = 'AI Triage Complete';
        } else {
          state = 'REPORTED';
          badge = 'bg-rose-50 text-rose-700 border-rose-200';
          label = 'Initial Call Ingested';
        }

        statuses[incId] = {
          state,
          badge,
          label,
          activeUnits: incidentsConfig[incId]?.assignedUnits || [],
          eventCount: incEvents.length,
          lastEvent: last,
        };
      }
    });
    return statuses;
  }, [events, currentTime, incidentsConfig]);

  // Auto scroll active event card in list
  useEffect(() => {
    if (timelineListRef.current) {
      const el = timelineListRef.current.querySelector(`[data-event-index="${nearestEventIndex}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [nearestEventIndex]);

  // Smooth playback timer — single stable interval reads from refs to avoid stale closures
  useEffect(() => {
    const intervalMs = 50;
    const tick = setInterval(() => {
      if (!playingRef.current) return; // paused — keep interval alive but skip tick
      setPosition(p => {
        // At 1x: 0.125% per 50ms → full 100% in 40 seconds real time
        const step = speedRef.current * 0.125;
        const next = p + step;
        if (next >= 100) {
          setPlaying(false);
          playingRef.current = false;
          return 100;
        }
        return next;
      });
    }, intervalMs);
    return () => clearInterval(tick);
  }, []); // intentionally empty — interval is stable, reads latest state via refs

  const togglePlay = () => {
    if (!playing && position >= 99.9) {
      setPosition(0);
      setPlaying(true);
    } else {
      setPlaying(!playing);
    }
  };

  const stepTime = (deltaSeconds) => {
    const deltaMs = deltaSeconds * 1000;
    const currentMs = currentTime.getTime();
    const targetMs = Math.max(startTime.getTime(), Math.min(endTime.getTime(), currentMs + deltaMs));
    const newPct = Math.max(0, Math.min(100, ((targetMs - startTime.getTime()) / totalDurationMs) * 100));
    setPosition(newPct);
  };

  const jumpToEvent = (eventIndex) => {
    if (!events[eventIndex]) return;
    const eventTime = new Date(events[eventIndex].ts).getTime();
    const pct = Math.max(0, Math.min(100, ((eventTime - startTime.getTime()) / totalDurationMs) * 100));
    setPosition(pct);
  };

  const jumpToPrevEvent = () => {
    const list = filteredEvents.length > 0 ? filteredEvents : events;
    const currentIdx = list.findIndex(e => e.index === nearestEventIndex);
    const targetIdx = currentIdx > 0 ? currentIdx - 1 : 0;
    if (list[targetIdx]) {
      jumpToEvent(list[targetIdx].index);
    }
  };

  const jumpToNextEvent = () => {
    const list = filteredEvents.length > 0 ? filteredEvents : events;
    const currentIdx = list.findIndex(e => e.index === nearestEventIndex);
    const targetIdx = currentIdx < list.length - 1 ? currentIdx + 1 : list.length - 1;
    if (list[targetIdx]) {
      jumpToEvent(list[targetIdx].index);
    }
  };

  const handleCopyPayload = () => {
    if (activeEvent?.payload) {
      navigator.clipboard.writeText(JSON.stringify(activeEvent.payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddCustomEvent = (e) => {
    e.preventDefault();
    if (!newEventSummary.trim()) return;

    const eventTime = new Date(currentTime.getTime() + 15000); // 15 seconds ahead of current scrubber
    const newEvt = {
      event_id: `evt_custom_${Date.now()}`,
      seq: events.length + 1,
      incident_id: newIncidentId,
      room: 'incidents',
      type: newEventType,
      category: newEventCategory,
      ts: eventTime.toISOString(),
      entity: { kind: 'incident', id: newIncidentId },
      actor: { kind: 'OPERATOR_MANUAL', id: 'usr_manual', name: newEventActor || 'Dispatcher' },
      summary: newEventSummary,
      payload: {
        incident_id: newIncidentId,
        note: newEventSummary,
        injected_at_replay_time: formatTime(currentTime.toISOString()),
        status: 'LOGGED_INTO_AUDIT_STREAM',
      },
    };

    setCustomEvents(prev => [...prev, newEvt]);
    setNewEventSummary('');
    setIsAddEventOpen(false);
  };

  const activeCategoryConf = CATEGORY_COLORS[activeEvent?.category] || CATEGORY_COLORS.dispatch;
  const ActiveIcon = activeCategoryConf.icon;
  const activeIncidentConf = incidentsConfig[activeEvent?.incident_id] || incidentsConfig.inc_naroda_01 || Object.values(incidentsConfig)[0];

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50 select-none">
      <div className="max-w-[1300px] mx-auto space-y-6">
        
        {/* Header with Title & Action Controls */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Clock size={24} className="text-blue-600" />
              Time-Travel Event Replay
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full ml-1">
                Multi-Incident
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Deterministic Timeline Reconstruction &amp; Concurrency Tracker
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* + Add Custom Event Button */}
            <button
              onClick={() => setIsAddEventOpen(!isAddEventOpen)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Add Event
            </button>
          </div>
        </div>

        {/* Inline Modal / Drawer to Add Custom Event to the Timeline */}
        {isAddEventOpen && (
          <div className="bg-white border-2 border-blue-500 rounded-xl p-3 shadow-md shrink-0">
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Plus size={15} className="text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Inject Custom Event into Timeline
                </span>
              </div>
              <button onClick={() => setIsAddEventOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAddCustomEvent} className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
              <div className="sm:col-span-3">
                <div className="relative">
                  <select
                    value={newIncidentId}
                    onChange={e => setNewIncidentId(e.target.value)}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-2.5 pr-8 py-1.5 text-xs font-medium text-slate-800"
                  >
                    {Object.entries(incidentsConfig).map(([id, conf]) => (
                      <option key={id} value={id}>{conf.shortTitle}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                </div>
              </div>

              <div className="sm:col-span-3">
                <div className="relative">
                  <select
                    value={newEventType}
                    onChange={e => setNewEventType(e.target.value)}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-2.5 pr-8 py-1.5 text-xs font-medium text-slate-800"
                  >
                    <option value="INCIDENT_ESCALATED">INCIDENT_ESCALATED</option>
                    <option value="CASUALTY_EVACUATED">CASUALTY_EVACUATED</option>
                    <option value="MUTUAL_AID_REQUESTED">MUTUAL_AID_REQUESTED</option>
                    <option value="AIR_QUALITY_WARNING">AIR_QUALITY_WARNING</option>
                    <option value="CONTAINMENT_UPDATE">CONTAINMENT_UPDATE</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                </div>
              </div>

              <div className="sm:col-span-3">
                <input
                  type="text"
                  value={newEventActor}
                  onChange={e => setNewEventActor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium text-slate-800"
                  placeholder="Actor (e.g. Commander)"
                />
              </div>

              <div className="sm:col-span-3 flex gap-2">
                <input
                  type="text"
                  value={newEventSummary}
                  onChange={e => setNewEventSummary(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium text-slate-800"
                  placeholder="Summary..."
                  required
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-3 rounded-lg shadow-xs transition-colors cursor-pointer text-xs shrink-0"
                >
                  Insert
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Incident Filter Dropdown (Replaces horizontal scrollbar) */}
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-xs shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 shrink-0">Incident:</span>
            <div className="relative min-w-[280px]" ref={incidentDropdownRef}>
              <button
                type="button"
                onClick={() => setIncidentDropdownOpen(!incidentDropdownOpen)}
                className="w-full flex items-center justify-between gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2 truncate">
                  {selectedIncidentFilters.length === 0 ? (
                    <span className="font-semibold text-slate-800">
                      All Incidents ({Object.keys(incidentsConfig).length})
                    </span>
                  ) : (
                    (() => {
                      const selectedId = selectedIncidentFilters[0];
                      const conf = incidentsConfig[selectedId];
                      if (!conf) return <span>All Incidents</span>;
                      return (
                        <>
                          {renderSeverityBadge(conf.severity)}
                          <span className="font-semibold text-slate-800 truncate">{conf.shortTitle}</span>
                        </>
                      );
                    })()
                  )}
                </div>
                <ChevronDown size={14} className={`text-slate-500 shrink-0 transition-transform duration-200 ${incidentDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Custom Popover Dropdown Menu */}
              {incidentDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-[360px] sm:w-[420px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden py-1 max-h-80 overflow-y-auto animate-in fade-in duration-100">
                  {/* Option: All Incidents */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIncidentFilters([]);
                      setIncidentDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold hover:bg-blue-50/70 transition-colors border-b border-slate-100 cursor-pointer ${
                      selectedIncidentFilters.length === 0 ? 'bg-blue-50/60 text-blue-700 font-bold' : 'text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-slate-100 text-slate-700 border border-slate-300">
                        ALL
                      </span>
                      <span>All Incidents ({Object.keys(incidentsConfig).length})</span>
                    </div>
                    {selectedIncidentFilters.length === 0 && <Check size={14} className="text-blue-600" />}
                  </button>

                  {/* Option Items with Severity Button Pills */}
                  {Object.entries(incidentsConfig).map(([incId, conf]) => {
                    const st = incidentStatuses[incId] || { label: 'Reported' };
                    const isSelected = selectedIncidentFilters.includes(incId);
                    return (
                      <button
                        key={incId}
                        type="button"
                        onClick={() => {
                          setSelectedIncidentFilters([incId]);
                          setIncidentDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs hover:bg-blue-50/70 transition-colors border-b border-slate-100/70 last:border-0 cursor-pointer ${
                          isSelected ? 'bg-blue-50/60 text-blue-700 font-bold' : 'text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          {/* Severity Button Badge */}
                          {renderSeverityBadge(conf.severity)}
                          <span className="font-semibold text-slate-800 truncate">{conf.shortTitle}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-medium text-slate-500">— {st.label}</span>
                          {isSelected && <Check size={14} className="text-blue-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick status summary of selected incident or active event incident */}
          {(() => {
            const targetId = selectedIncidentFilters[0] || activeEvent?.incident_id;
            const targetConf = targetId ? incidentsConfig[targetId] : null;
            if (!targetConf) return null;
            const st = incidentStatuses[targetId] || { state: 'REPORTED', badge: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Reported' };
            const isExplicit = selectedIncidentFilters.length > 0;
            return (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">
                  {isExplicit ? 'Filtered Incident:' : 'Current Event Incident:'}
                </span>
                <span className={`font-bold px-2 py-0.5 rounded border ${targetConf.badgeBg} ${targetConf.badgeText} ${targetConf.badgeBorder}`}>
                  {targetConf.severity}
                </span>
                <span className="font-semibold text-slate-700 max-w-[280px] truncate">
                  {targetConf.title || targetConf.shortTitle}
                </span>
                <span className={`font-medium px-2 py-0.5 rounded-full border ${st.badge}`}>
                  {st.label}
                </span>
                {isExplicit && (
                  <button
                    type="button"
                    onClick={() => setSelectedIncidentFilters([])}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 underline cursor-pointer ml-1"
                  >
                    Show All
                  </button>
                )}
              </div>
            );
          })()}
        </div>

        {/* Main 2-Column Playback Canvas */}
        <div className="h-[600px] grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* Left Column: Chronological Event Stream Feed (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl flex flex-col shadow-xs h-full min-h-0 overflow-hidden">
            {/* Feed Header & Filters */}
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Radio size={13} className="text-blue-600 animate-pulse" />
                  Chronological Stream ({filteredEvents.length})
                </span>
                <span className="text-xs font-mono font-medium text-slate-500">
                  Step {nearestEventIndex + 1} of {events.length}
                </span>
              </div>

              {/* Quick Filter Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Filter:</span>
                <div className="relative flex-1">
                  <select
                    value={quickFilter}
                    onChange={e => setQuickFilter(e.target.value)}
                    className="w-full appearance-none bg-white border border-slate-200 rounded-lg pl-2.5 pr-8 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all"
                  >
                    <option value="all">All Events</option>
                    <option value="latest5">Latest Incidents</option>
                    <option value="critical">Critical Only</option>
                    <option value="recent">Last 5 Min</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                </div>
              </div>


              {/* Category Filter Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Type:</span>
                <div className="relative flex-1">
                  <select
                    value={selectedCategoryFilters[0] || 'ALL'}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === 'ALL') toggleCategoryFilter('ALL');
                      else { setSelectedCategoryFilters([val]); }
                    }}
                    className="w-full appearance-none bg-white border border-slate-200 rounded-lg pl-2.5 pr-8 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all capitalize"
                  >
                    <option value="ALL">All Types</option>
                    {['incident', 'ai', 'dispatch', 'units', 'hospital'].map(cat => (
                      <option key={cat} value={cat} className="capitalize">{cat}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                </div>
              </div>
            </div>

            {/* Scrollable Event List */}
            <div ref={timelineListRef} className="flex-1 overflow-y-auto p-3.5 space-y-2.5 divide-slate-100">
              {filteredEvents.map(evt => {
                const isCurrent = evt.index === nearestEventIndex;
                const conf = CATEGORY_COLORS[evt.category] || CATEGORY_COLORS.dispatch;
                const inc = incidentsConfig[evt.incident_id] || incidentsConfig.inc_naroda_01 || Object.values(incidentsConfig)[0];
                const Icon = conf.icon;
                return (
                  <div
                    key={evt.event_id}
                    data-event-index={evt.index}
                    onClick={() => jumpToEvent(evt.index)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                      isCurrent
                        ? 'bg-blue-50/50 border-2 border-blue-600 shadow-sm ring-2 ring-blue-100/80 scale-[1.01]'
                        : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${conf.bg} ${conf.text} ${conf.border} border flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon size={16} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {evt.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs font-mono text-slate-500 shrink-0 font-medium">
                          {formatTime(evt.ts)}
                        </span>
                      </div>

                      {/* Incident Badge */}
                      <div className="mb-1.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${inc.badgeBg} ${inc.badgeText} ${inc.badgeBorder}`}>
                          {inc.shortTitle}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {evt.summary || evt.payload?.description || evt.payload?.title || JSON.stringify(evt.payload)}
                      </p>

                      <div className="flex items-center gap-2 mt-2.5 text-xs text-slate-500">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-medium">
                          {evt.actor?.name || evt.actor?.kind || 'System'}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-slate-400">seq #{evt.seq}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Replay Snapshot Inspector with 3 Tabs (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl flex flex-col shadow-xs h-full min-h-0 overflow-hidden">
            
            {/* Inspector Navigation Tabs */}
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => setInspectorTab('focus')}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    inspectorTab === 'focus'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye size={14} />
                  Event Detail
                </button>
                <button
                  onClick={() => setInspectorTab('citywide')}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    inspectorTab === 'citywide'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Grid size={14} />
                  Citywide Multi-Incident State
                </button>
              </div>

              {inspectorTab === 'focus' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyPayload}
                    className="text-xs font-semibold text-slate-600 hover:text-blue-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy Payload'}
                  </button>
                </div>
              )}
            </div>

            {/* Tab 1: Single Focused Event Detail */}
            {inspectorTab === 'focus' && (
              <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
                
                {/* Event Title & Incident Indicator */}
                <div className="flex items-start justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start gap-3.5">
                    <div className={`w-10 h-10 rounded-xl ${activeCategoryConf.bg} ${activeCategoryConf.text} ${activeCategoryConf.border} border flex items-center justify-center shrink-0`}>
                      <ActiveIcon size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide">
                          {activeEvent?.type?.replace(/_/g, ' ')}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${activeCategoryConf.bg} ${activeCategoryConf.text} ${activeCategoryConf.border}`}>
                          {activeEvent?.category?.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-1">
                        Timestamp: {formatDateTime(activeEvent?.ts || currentTime.toISOString())}
                      </div>
                      <div className="mt-1.5">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${activeIncidentConf.badgeBg} ${activeIncidentConf.badgeText} ${activeIncidentConf.badgeBorder}`}>
                          Incident: {activeIncidentConf.title}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Structured Cards View */}
                <div className="space-y-4">
                  {/* Summary Callout */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Summary
                    </div>
                    <div className="text-sm font-medium text-slate-900 leading-relaxed">
                      {activeEvent?.summary || activeEvent?.payload?.description || 'Operational state transitioned at this timestamp.'}
                    </div>
                  </div>

                  {/* Operational Context Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="border border-slate-200 rounded-xl p-4 bg-white">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Bot size={14} className="text-blue-600" />
                        Authoritative Actor
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        {activeEvent?.actor?.name || 'Automated Orchestrator'}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Kind: <code className="text-blue-600 font-mono">{activeEvent?.actor?.kind || 'SYSTEM'}</code>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-4 bg-white">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Layers size={14} className="text-emerald-600" />
                        Target Entity
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        {activeEvent?.entity?.id || 'Regional Grid'}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Entity Type: <code className="text-emerald-600 font-mono">{activeEvent?.entity?.kind || 'global'}</code>
                      </div>
                    </div>
                  </div>

                  {/* Operational Telemetry Attributes */}
                  {activeEvent?.payload && (
                    <div className="border border-slate-200 rounded-xl p-4 bg-white">
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                        Operational Telemetry Attributes
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        {Object.entries(activeEvent.payload)
                          .filter(([k]) => !['description'].includes(k))
                          .map(([key, val]) => (
                            <div key={key} className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                              <span className="text-xs uppercase font-semibold text-slate-500 block truncate mb-1">
                                {key.replace(/_/g, ' ')}
                              </span>
                              <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Citywide Concurrent State at `currentTime` */}
            {inspectorTab === 'citywide' && (
              <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
                <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-blue-900">Citywide Incident Snapshot</span>
                    <p className="text-xs text-blue-700 mt-0.5">Reconstructed status across all sectors at this exact moment</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-800 bg-white border border-blue-200 px-3 py-1 rounded-md">
                    {formatTime(currentTime.toISOString())}
                  </span>
                </div>

                {/* Incident Cards */}
                <div className="space-y-3">
                  {Object.entries(incidentsConfig).map(([incId, conf]) => {
                    const st = incidentStatuses[incId] || { state: 'REPORTED', badge: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Reported' };
                    return (
                      <div key={incId} className="border border-slate-200 rounded-xl p-4 bg-white space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{conf.title}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${conf.badgeBg} ${conf.badgeText} ${conf.badgeBorder}`}>
                              {conf.severity}
                            </span>
                          </div>
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${st.badge}`}>
                            {st.label}
                          </span>
                        </div>

                        <div className="text-xs sm:text-sm text-slate-600">
                          {st.lastEvent ? st.lastEvent.summary : 'Awaiting emergency report in this timeframe.'}
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                          <span>Deployed Apparatus: <strong>{conf.assignedUnits?.length ? conf.assignedUnits.join(', ') : 'Standby / En Route'}</strong></span>
                          <span>Ward: <strong>{conf.ward}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Fleet Allocation Summary */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Regional Emergency Resource Allocation
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                      <span className="text-xs uppercase font-semibold text-slate-500 block mb-1">Active Apparatus</span>
                      <span className="text-lg font-bold text-blue-600 block">8 / 14</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                      <span className="text-xs uppercase font-semibold text-slate-500 block mb-1">ICU Beds Reserved</span>
                      <span className="text-lg font-bold text-emerald-600 block">7 beds</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                      <span className="text-xs uppercase font-semibold text-slate-500 block mb-1">Total Casualties</span>
                      <span className="text-lg font-bold text-orange-600 block">7 citizens</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Docked Playback Bar - Clean & Non-Overlaying */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
          
          {/* Top Row: Time Range & Full Width Range Slider */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-semibold text-slate-500 shrink-0">
              {formatTime(startTime.toISOString())}
            </span>
            <div className="flex-1 relative flex items-center">
              <input
                type="range"
                min={0}
                max={100}
                step={0.1}
                value={position}
                onChange={e => setPosition(Number(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer border border-slate-200
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-sm
                  hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
              />
            </div>
            <span className="font-mono text-xs font-semibold text-slate-500 shrink-0 text-right">
              {formatTime(endTime.toISOString())}
            </span>
          </div>

          {/* Bottom Row: Scrubber Telemetry, Center Transport Buttons, Speed Multipliers */}
          <div className="flex items-center justify-between">
            {/* Left: Current Scrubbed Time & Progress */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                {formatTime(currentTime.toISOString())}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {Math.round(position)}% · Step {nearestEventIndex + 1}/{events.length}
              </span>
            </div>

            {/* Center: Playback Transport Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                title="Jump to Previous Event"
                onClick={jumpToPrevEvent}
                className="w-8.5 h-8.5 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
              >
                <SkipBack size={15} />
              </button>

              <button
                type="button"
                title="Rewind 15 Seconds"
                onClick={() => stepTime(-15)}
                className="w-8.5 h-8.5 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
              >
                <Rewind size={15} />
              </button>

              <button
                type="button"
                title={playing ? "Pause" : "Play"}
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer mx-1"
              >
                {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
              </button>

              <button
                type="button"
                title="Fast Forward 15 Seconds"
                onClick={() => stepTime(15)}
                className="w-8.5 h-8.5 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
              >
                <FastForward size={15} />
              </button>

              <button
                type="button"
                title="Jump to Next Event"
                onClick={jumpToNextEvent}
                className="w-8.5 h-8.5 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
              >
                <SkipForward size={15} />
              </button>
            </div>

            {/* Right: Speed Multiplier Presets */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {[0.5, 1, 2, 4, 8].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={`text-xs px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                    speed === s
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
