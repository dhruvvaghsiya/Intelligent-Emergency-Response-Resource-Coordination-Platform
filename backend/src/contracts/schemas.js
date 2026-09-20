import { z } from 'zod';
import { SOURCE_TYPE, INCIDENT_TYPE, INCIDENT_STATUS, SEVERITY, UNIT_STATUS, CAPABILITY, ROLE } from './enums.js';

export const GeoPointSchema = z.object({
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
});

export const ReportBodySchema = z.object({
  source_type: z.enum(SOURCE_TYPE),
  source_label: z.string().min(1),
  reporter_ref: z.string().nullable().optional(),
  text: z.string().max(4000).default(''),
  language: z.string().default('auto'),
  location: GeoPointSchema,
  location_accuracy_m: z.number().nonnegative().nullable().optional(),
  occurred_at: z.string().datetime().optional(),
  media: z.array(z.object({ kind: z.string(), url: z.string(), caption: z.string().nullable().optional() })).default([]),
  structured: z.record(z.any()).nullable().optional(),
  is_simulated: z.boolean().default(false),
  sim_run_id: z.string().nullable().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const RefreshSchema = z.object({
  refresh_token: z.string().min(1),
});

// §access-control — the only place an operator's role is now assigned: an authenticated ADMIN
// calling POST /admin/users, never a self-serve register endpoint.
export const AdminCreateUserSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(ROLE),
  station_id: z.string().nullable().optional(),
});

export const IncidentPatchSchema = z.object({
  status: z.enum(INCIDENT_STATUS).optional(),
  type: z.enum(INCIDENT_TYPE).optional(),
  title: z.string().optional(),
  severity_override: z.enum(SEVERITY).optional(),
  version: z.number().int(),
});

export const IncidentCreateSchema = z.object({
  type: z.enum(INCIDENT_TYPE),
  title: z.string().min(1),
  description: z.string().default(''),
  location: GeoPointSchema,
  address: z.string().nullable().optional(),
  ward: z.string().nullable().optional(),
  occurred_at: z.string().datetime().optional(),
});

export const SeverityOverrideSchema = z.object({
  severity: z.enum(SEVERITY),
  reason: z.string().min(1),
});

export const MergeSchema = z.object({
  source_incident_ids: z.array(z.string()).min(1),
  reason: z.string().min(1),
});

export const UnmergeSchema = z.object({
  child_incident_ids: z.array(z.string()).min(1),
});

export const LinkSchema = z.object({
  to_incident_id: z.string(),
  relation: z.enum(['DUPLICATE_OF', 'LIKELY_SAME_AS', 'RELATED_TO', 'CAUSED_BY', 'CAUSES', 'ESCALATION_OF']),
  note: z.string().optional(),
});

export const UnitPatchSchema = z.object({
  status: z.enum(UNIT_STATUS).optional(),
  crew_size: z.number().int().positive().optional(),
  station_id: z.string().nullable().optional(),
  version: z.number().int().optional(),
});

export const UnitLocationSchema = z.object({
  lng: z.number(), lat: z.number(),
  heading: z.number().nullable().optional(),
  speed_mps: z.number().nullable().optional(),
  recorded_at: z.string().datetime().optional(),
});

export const AssignmentCreateSchema = z.object({
  incident_id: z.string(),
  unit_id: z.string(),
});

export const AssignmentCancelSchema = z.object({
  reason: z.string().min(1),
});

export const EvidenceSupersedeSchema = z.object({
  reason: z.string().min(1),
});
