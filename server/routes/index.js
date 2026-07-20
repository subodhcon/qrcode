import { Router } from 'express';
import { getHealth } from '../controllers/healthController.js';
import { 
  getLocationBySlug, 
  getLocations, 
  createLocation, 
  updateLocation, 
  deleteLocation 
} from '../controllers/locationController.js';
import {
  getNearestMedicalCenter,
  getMedicalCenters,
  createMedicalCenter,
  updateMedicalCenter,
  deleteMedicalCenter
} from '../controllers/medicalController.js';
import { getNavigationDetails, getAllFacilitiesNear } from '../controllers/mapController.js';
import { getTelemetryStats } from '../controllers/analyticsController.js';
import { login, logout, getProfile } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/auth.js';
import qrRoutes from '../routes/qrRoutes.js';

const router = Router();
router.use('/qr', qrRoutes);

// Health Check API
router.get('/health', getHealth);

// Location Details API
router.get('/location/:slug', getLocationBySlug);

// Locations CRUD APIs
router.get('/locations', getLocations);
router.post('/locations', requireAuth, createLocation);
router.put('/locations/:id', requireAuth, updateLocation);
router.delete('/locations/:id', requireAuth, deleteLocation);

// Medical Nearest API
router.get('/medical/nearest/:locationId', getNearestMedicalCenter);

// Analytics API
router.get('/analytics/telemetry', requireAuth, getTelemetryStats);

// Medical CRUD APIs
router.get('/medical', getMedicalCenters);
router.post('/medical', requireAuth, createMedicalCenter);
router.put('/medical/:id', requireAuth, updateMedicalCenter);
router.delete('/medical/:id', requireAuth, deleteMedicalCenter);

// Navigation API
router.get('/navigation', getNavigationDetails);

// Facilities Near a Location (all types, with distances)
router.get('/facilities/near/:locationSlug', getAllFacilitiesNear);

// Admin Authentication APIs
router.post('/auth/login', login);
router.post('/auth/logout', logout);
router.get('/auth/profile', requireAuth, getProfile);

export default router;
