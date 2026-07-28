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
import { login, logout, getProfile } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/auth.js';
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

// Telemetry Logging APIs
router.post('/analytics/scan', trackQRScan);
router.post('/analytics/click', trackNavigationClick);
router.get('/analytics/telemetry', requireAuth, getTelemetryStats);

// Google Maps live search API proxy
router.get('/config/maps-key', (req, res) => {
  return res.status(200).json({ 
    success: true, 
    key: process.env.GOOGLE_PLACES_API_KEY 
  });
});
router.get('/facilities/near', getAllFacilitiesNear);
router.get('/facilities/near/:locationSlug', getAllFacilitiesNear);

// Announcement & Alert Broadcast APIs
router.get('/announcement', async (req, res) => {
  try {
    const latest = await Announcement.findOne().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: latest });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/announcement', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Announcement text is required.' });
    }
    const newAnnouncement = new Announcement({ text });
    await newAnnouncement.save();
    return res.status(201).json({ success: true, data: newAnnouncement });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Admin Authentication APIs
router.post('/auth/login', login);
router.post('/auth/logout', logout);
router.get('/auth/profile', requireAuth, getProfile);

// Feedback submission & retrieval APIs
router.post('/feedback', async (req, res) => {
  try {
    const { name, phone, category, locationContext, message } = req.body;
    if (!category || !message) {
      return res.status(400).json({ success: false, message: 'Category and Message are required.' });
    }
    const newFeedback = new Feedback({ name, phone, category, locationContext, message });
    await newFeedback.save();
    return res.status(201).json({ success: true, data: newFeedback });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/feedback', requireAuth, async (req, res) => {
  try {
    const reports = await Feedback.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: reports });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/feedback/:id/resolve', requireAuth, async (req, res) => {
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
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/feedback/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Feedback.findByIdAndDelete(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }
    return res.status(200).json({ success: true, message: 'Report deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
