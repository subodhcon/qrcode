import { Router } from 'express';
// Trigger nodemon reload after background task kill
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
import { login, logout, getProfile } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/auth.js';
import { authLimiter, apiLimiter } from '../middlewares/rateLimiter.js';
import qrRoutes from './qrRoutes.js';
import touristRoutes from './touristRoutes.js';
import lostReportRoutes from './lostReportRoutes.js';
import Announcement from '../models/Announcement.js';
import { Feedback } from '../models/Feedback.js';

const router = Router();

// Health Check API
router.get('/health', getHealth);

// Category CRUD APIs
router.get('/categories', getCategories);
router.post('/categories', requireAuth, createCategory);
router.put('/categories/:id', requireAuth, updateCategory);
router.delete('/categories/:id', requireAuth, deleteCategory);

// Location & Gate APIs (QR code landing and admin management)
router.get('/location/:slug', getLocationBySlug);
router.get('/locations', getLocations);
router.post('/locations', requireAuth, createLocation);
router.put('/locations/:id', requireAuth, updateLocation);
router.delete('/locations/:id', requireAuth, deleteLocation);

// Medical & Facility APIs (Nearest lookup for landing cards & admin management)
router.get('/medical/nearest/:locationId', getNearestMedicalCenter);
router.get('/medical', getMedicalCenters);
router.post('/medical', requireAuth, createMedicalCenter);
router.put('/medical/:id', requireAuth, updateMedicalCenter);
router.delete('/medical/:id', requireAuth, deleteMedicalCenter);

// QR Code Management & Analytics Routes
router.use('/qrcodes', qrRoutes);

// Tourist Desk & Registration Routes
router.use('/tourists', touristRoutes);

// Lost and Found Assistance Routes
router.use('/lost-reports', lostReportRoutes);

// Telemetry Logging APIs
router.post('/analytics/scan', apiLimiter, trackQRScan);
router.post('/analytics/click', apiLimiter, trackNavigationClick);
router.get('/analytics/telemetry', requireAuth, getTelemetryStats);

// =========================================================================
// [PRESERVED]: Google Maps live search API proxy
// router.get('/config/maps-key', (req, res) => {
//   return res.status(200).json({ 
//     success: true, 
//     key: process.env.GOOGLE_PLACES_API_KEY 
//   });
// });
// =========================================================================

// =========================================================================
// [ACTIVE]: OpenStreetMap (OSM) Map Configuration Endpoint
// =========================================================================
router.get('/config/maps-key', (req, res) => {
  return res.status(200).json({ 
    success: true, 
    provider: 'osm',
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    routingUrl: 'https://router.project-osrm.org/route/v1/walking',
    key: null 
  });
});
router.get('/facilities/near', getAllFacilitiesNear);
router.get('/facilities/near/:locationSlug', getAllFacilitiesNear);

// Announcement & Alert Broadcast APIs
router.get('/announcement', async (req, res, next) => {
  try {
    const latest = await Announcement.findOne().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: latest });
  } catch (error) {
    next(error);
  }
});

router.post('/announcement', requireAuth, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Announcement text is required.' });
    }
    const newAnnouncement = new Announcement({ text });
    await newAnnouncement.save();
    return res.status(201).json({ success: true, data: newAnnouncement });
  } catch (error) {
    next(error);
  }
});

router.delete('/announcement', requireAuth, async (req, res, next) => {
  try {
    await Announcement.deleteMany({});
    return res.status(200).json({ success: true, message: 'All announcements cleared successfully.' });
  } catch (error) {
    next(error);
  }
});

// Admin Authentication APIs
router.post('/auth/login', authLimiter, login);
router.post('/auth/logout', logout);
router.get('/auth/profile', requireAuth, getProfile);

// Feedback submission & retrieval APIs
router.post('/feedback', apiLimiter, async (req, res, next) => {
  try {
    const { name, phone, category, locationContext, message } = req.body;
    if (!category || !message) {
      return res.status(400).json({ success: false, message: 'Category and Message are required.' });
    }
    const newFeedback = new Feedback({ name, phone, category, locationContext, message });
    await newFeedback.save();
    return res.status(201).json({ success: true, data: newFeedback });
  } catch (error) {
    next(error);
  }
});

router.get('/feedback', requireAuth, async (req, res, next) => {
  try {
    const reports = await Feedback.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
});

router.put('/feedback/:id/resolve', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await Feedback.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }
    report.status = report.status === 'Resolved' ? 'New' : 'Resolved';
    await report.save();
    return res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

router.delete('/feedback/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await Feedback.findByIdAndDelete(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }
    return res.status(200).json({ success: true, message: 'Report deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
