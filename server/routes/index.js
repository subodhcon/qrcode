import { Router } from 'express';
import { getHealth } from '../controllers/healthController.js';
import { getAllFacilitiesNear } from '../controllers/mapController.js';
import { 
  getTelemetryStats, 
  trackQRScan, 
  trackNavigationClick 
} from '../controllers/analyticsController.js';
import { 
  getCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} from '../controllers/categoryController.js';
import { login, logout, getProfile } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// Health Check API
router.get('/health', getHealth);

// Category CRUD APIs
router.get('/categories', getCategories);
router.post('/categories', requireAuth, createCategory);
router.put('/categories/:id', requireAuth, updateCategory);
router.delete('/categories/:id', requireAuth, deleteCategory);

// Telemetry Logging APIs
router.post('/analytics/scan', trackQRScan);
router.post('/analytics/click', trackNavigationClick);
router.get('/analytics/telemetry', requireAuth, getTelemetryStats);

// Google Maps live search API proxy
router.get('/facilities/near', getAllFacilitiesNear);
router.get('/facilities/near/:locationSlug', getAllFacilitiesNear);

// Admin Authentication APIs
router.post('/auth/login', login);
router.post('/auth/logout', logout);
router.get('/auth/profile', requireAuth, getProfile);

export default router;
