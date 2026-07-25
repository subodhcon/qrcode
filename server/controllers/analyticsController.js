import { Scan } from '../models/Scan.js';
import { NavigationClick } from '../models/NavigationClick.js';
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

    // 2. Fetch and count click logs
    const clicks = await NavigationClick.find({});
    clicks.forEach((c) => {
      const cat = c.locationId || 'General';
      if (facilityClicks[cat] !== undefined) {
        facilityClicks[cat] += 1;
      } else {
        // Log custom or legacy categories if they have clicks
        facilityClicks[cat] = 1;
      }
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
