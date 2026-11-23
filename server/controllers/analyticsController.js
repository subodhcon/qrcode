import { Scan } from '../models/Scan.js';
import { NavigationClick } from '../models/NavigationClick.js';
import { MedicalClick } from '../models/MedicalClick.js';
import { Category } from '../models/Category.js';

/**
 * Track a general QR code scan event.
 * POST /api/analytics/scan
 */
export const trackQRScan = async (req, res, next) => {
  try {
    await Scan.create({ qrCodeId: 'event-map' });
    return res.status(201).json({ success: true, message: 'Scan recorded.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Track a category click/navigation event.
 * POST /api/analytics/click
 */
export const trackNavigationClick = async (req, res, next) => {
  try {
    const { category } = req.body;
    if (!category) {
      return res.status(400).json({ success: false, message: 'Category is required.' });
    }
    await NavigationClick.create({ locationId: category });
    return res.status(201).json({ success: true, message: 'Click recorded.' });
  } catch (error) {
    next(error);
  }
};

export const getTelemetryStats = async (req, res, next) => {
  try {
    const totalScans = await Scan.countDocuments({});
    const totalNavigations = await NavigationClick.countDocuments({});

    // 1. Fetch active categories to build dynamic tracking keys
    const activeCategories = await Category.find({ status: 'Active' });
    const facilityClicks = {};
    activeCategories.forEach((cat) => {
      facilityClicks[cat.name] = 0;
    });

    // 2. Fetch aggregated click counts directly from DB via Aggregation Pipeline (O(1) memory)
    const aggregatedClicks = await NavigationClick.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$locationId', 'General'] },
          count: { $sum: 1 }
        }
      }
    ]);

    aggregatedClicks.forEach((item) => {
      const cat = item._id || 'General';
      facilityClicks[cat] = item.count;
    });

    return res.status(200).json({
      success: true,
      data: {
        totalScans,
        totalNavigations,
        facilityClicks,
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Track medical/facility click event.
 * POST /api/qrcodes/medical/:id/click
 */
export const trackMedicalClick = async (req, res, next) => {
  try {
    const { id } = req.params;
    await MedicalClick.create({ medicalCenterId: id });
    return res.status(201).json({ success: true, message: 'Click recorded.' });
  } catch (error) {
    next(error);
  }
};

// Alias for dashboard telemetry
export const getDashboardStats = getTelemetryStats;
