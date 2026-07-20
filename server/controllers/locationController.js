import { Location } from '../models/Location.js';

/**
 * Fetch details of a scanned QR code location by slug.
 * GET /api/location/:slug
 */
export const getLocationBySlug = async (req, res, next) => {
  const { slug } = req.params;

  try {
    const location = await Location.findOne({ slug });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: `Location with slug '${slug}' not found. Please verify the scanned QR code.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: location,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch all locations (Gates) for admin overview
 * GET /api/locations
 */
export const getLocations = async (req, res, next) => {
  try {
    const locations = await Location.find({ deletedAt: null }).sort({ name: 1 });
    return res.status(200).json({
      success: true,
      data: locations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new gate location
 * POST /api/locations
 */
export const createLocation = async (req, res, next) => {
  const { name, latitude, longitude, description, type } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ success: false, message: 'Name is required.' });
  }

  const latNum = parseFloat(latitude);
  const lngNum = parseFloat(longitude);

  if (isNaN(latNum) || latNum < -90 || latNum > 90) {
    return res.status(400).json({ success: false, message: 'Latitude must be a valid number between -90 and 90.' });
  }

  if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
    return res.status(400).json({ success: false, message: 'Longitude must be a valid number between -180 and 180.' });
  }

  try {
    // Generate a simple url-friendly slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newLoc = await Location.create({
      name,
      slug,
      latitude: latNum,
      longitude: lngNum,
      description: description || '',
      type: type || 'Gate'
    });

    return res.status(201).json({
      success: true,
      data: newLoc
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing gate location
 * PUT /api/locations/:id
 */
export const updateLocation = async (req, res, next) => {
  const { id } = req.params;
  const { name, latitude, longitude, description, type } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ success: false, message: 'Name is required.' });
  }

  const latNum = parseFloat(latitude);
  const lngNum = parseFloat(longitude);

  if (isNaN(latNum) || latNum < -90 || latNum > 90) {
    return res.status(400).json({ success: false, message: 'Latitude must be a valid number between -90 and 90.' });
  }

  if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
    return res.status(400).json({ success: false, message: 'Longitude must be a valid number between -180 and 180.' });
  }

  try {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const updatedLoc = await Location.findOneAndUpdate(
      { _id: id },
      { name, slug, latitude: latNum, longitude: lngNum, description: description || '', type: type || 'Gate' },
      { new: true }
    );

    if (!updatedLoc) {
      return res.status(404).json({ success: false, message: 'Location not found.' });
    }

    return res.status(200).json({
      success: true,
      data: updatedLoc
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft delete a gate location
 * DELETE /api/locations/:id
 */
export const deleteLocation = async (req, res, next) => {
  const { id } = req.params;

  try {
    const deletedLoc = await Location.findOneAndUpdate(
      { _id: id },
      { deletedAt: new Date() }
    );

    if (!deletedLoc) {
      return res.status(404).json({ success: false, message: 'Location not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Location deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

