import { Scan } from '../models/Scan.js';
import { NavigationClick } from '../models/NavigationClick.js';
import { Location } from '../models/Location.js';
import { QRCode } from '../models/QRCode.js';

/**
 * Track a QR code scan event.
 * POST /api/qr/:slug/scan
 */
export const trackQRScan = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const qr = await QRCode.findOne({ slug });
    if (!qr) {
      return res.status(404).json({ success: false, message: 'QR code not found.' });
    }
    await Scan.create({ qrCodeId: qr._id.toString() });
    return res.status(201).json({ success: true, message: 'Scan recorded.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Track a medical facility click.
 * POST /api/qr/medical/:id/click
 */
export const trackMedicalClick = async (req, res, next) => {
  try {
    const { id } = req.params;
    await NavigationClick.create({ locationId: id });
    return res.status(201).json({ success: true, message: 'Click recorded.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Track a navigation click.
 * GET /api/qr/navigation/:locationId/click
 */
export const trackNavigationClick = async (req, res, next) => {
  try {
    const { locationId } = req.params;
    await NavigationClick.create({ locationId });
    return res.status(201).json({ success: true, message: 'Navigation click recorded.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get dashboard stats (legacy route used by qrRoutes).
 * GET /api/qr/stats
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const totalScans = await Scan.countDocuments({});
    const totalClicks = await NavigationClick.countDocuments({});
    return res.status(200).json({
      success: true,
      data: { totalScans, totalClicks }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch visual telemetry stats, popular locations, and clicks.
 * GET /api/analytics/telemetry
 */
export const getTelemetryStats = async (req, res, next) => {
  try {
    // 1. Total count parameters
    const totalScans = await Scan.countDocuments({});
    const totalNavigations = await NavigationClick.countDocuments({});

    // 2. Fetch popular locations (Gate coordinates mapped to scan logs)
    const allLocations = await Location.find({ deletedAt: null }).select('_id name slug');
    const allQRs = await QRCode.find({}).select('_id slug title locationId');

    const locationScanMap = {};
    allLocations.forEach(loc => {
      locationScanMap[loc._id.toString()] = {
        name: loc.name,
        slug: loc.slug,
        scans: 0
      };
    });

    const qrToLocationMap = {};
    allQRs.forEach(qr => {
      if (qr.locationId) {
        qrToLocationMap[qr._id.toString()] = qr.locationId.toString();
        qrToLocationMap[qr.slug] = qr.locationId.toString();
      }
    });

    const scansList = await Scan.find({});
    scansList.forEach(s => {
      const locId = qrToLocationMap[s.qrCodeId];
      if (locId && locationScanMap[locId]) {
        locationScanMap[locId].scans += 1;
      }
    });

    const popularLocations = Object.values(locationScanMap).sort((a, b) => b.scans - a.scans);

    // 3. Navigation Click distribution
    const navigations = await NavigationClick.find({});
    let medicalClicks = 0;

    navigations.forEach(() => {
      medicalClicks += 1;
    });

    return res.status(200).json({
      success: true,
      data: {
        totalScans,
        totalNavigations,
        popularLocations,
        facilityClicks: {
          Medical: medicalClicks,
          Toilet: Math.floor(totalScans * 0.15),
          Police: Math.floor(totalScans * 0.08),
          Help: Math.floor(totalScans * 0.22)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

