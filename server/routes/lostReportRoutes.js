import { Router } from 'express';
import {
  createLostReport,
  getLostReports,
  updateLostReportStatus,
  deleteLostReport
} from '../controllers/lostReportController.js';
import { requireAuth } from '../middlewares/auth.js';
import { lostReportLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// Public endpoint for mela counters and pilgrims to report a lost person (rate-limited)
router.post('/', lostReportLimiter, createLostReport);

// Superadmin / Control Room endpoints
router.get('/', requireAuth, getLostReports);
router.put('/:id/status', requireAuth, updateLostReportStatus);
router.delete('/:id', requireAuth, deleteLostReport);

export default router;
