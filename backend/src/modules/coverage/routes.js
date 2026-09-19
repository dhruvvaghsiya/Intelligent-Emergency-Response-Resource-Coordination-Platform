import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, PERMISSIONS } from '../../platform/rbac.js';
import { computeCoverage, toCoverageGeoJson, suggestRepositioning } from './service.js';

export const coverageRouter = Router();

coverageRouter.get('/coverage', authenticate, async (req, res, next) => {
  try {
    const minutes = Number(req.query.minutes) || 8;
    const bbox = req.query.bbox ? String(req.query.bbox).split(',').map(Number) : undefined;
    const cells = await computeCoverage({ minutes, bbox });
    res.json({ data: toCoverageGeoJson(cells) });
  } catch (err) { next(err); }
});

coverageRouter.get('/coverage/repositioning', authenticate, requirePermission(PERMISSIONS.OVERRIDE_SEVERITY), async (req, res, next) => {
  try {
    const cells = await computeCoverage({});
    const suggestions = await suggestRepositioning(cells);
    res.json({ data: suggestions });
  } catch (err) { next(err); }
});
