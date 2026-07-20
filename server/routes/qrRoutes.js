import { Router } from 'express';
import { list, create, download, remove, toggleStatus, update } from '../controllers/qrController.js';
import { requireAuth } from '../middlewares/auth.js';
import { trackQRScan, trackMedicalClick, trackNavigationClick, getDashboardStats } from '../controllers/analyticsController.js';

const router = Router();

// List QR codes (admin protected)
router.get('/', requireAuth, list);

// Create QR code (admin protected)
router.post('/', requireAuth, create);

// Download QR code PNG (admin protected)
router.get('/:slug/download', requireAuth, download);

// Soft delete QR code (admin protected)
router.delete('/:slug', requireAuth, remove);

// Toggle QR code status (admin protected)
router.patch('/:slug/status', requireAuth, toggleStatus);

// Update QR code (admin protected)
router.put('/:slug', requireAuth, update);
router.patch('/:slug', requireAuth, update);

// Analytics routes
router.post('/:slug/scan', trackQRScan);
router.post('/medical/:id/click', trackMedicalClick);
router.get('/navigation/:locationId/click', trackNavigationClick);
router.get('/stats', requireAuth, getDashboardStats);

export default router;
