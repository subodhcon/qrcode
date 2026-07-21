import mongoose from 'mongoose';
import { Facility } from '../models/Facility.js';
import { Location } from '../models/Location.js';

// Haversine distance calculator in meters
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // returns distance in meters
}

/**
 * Fetch the nearest facility relative to a location by type (default Medical).
 * GET /api/medical/nearest/:locationId?type=Medical
 */
export const getNearestMedicalCenter = async (req, res, next) => {
  const { locationId } = req.params;
  const type = req.query.type || 'Medical';

  try {
    let location = null;
    let nearestFacility = null;

    // Find location safely without triggering CastError on string slugs
    const queryConditions = [{ slug: locationId }];
    if (mongoose.Types.ObjectId.isValid(locationId)) {
      queryConditions.push({ _id: locationId });
    }
    location = await Location.findOne({ $or: queryConditions });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: `Location '${locationId}' not found. Cannot calculate nearest facility.`,
      });
    }

    // Find all active, non-deleted facilities of this specific type
    const activeFacilities = await Facility.find({ type, status: 'Active', deletedAt: null });

    if (!activeFacilities || activeFacilities.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No active ${type} facilities found in storage.`,
      });
    }

    // Calculate nearest by comparing distances
    let minDistance = Infinity;
    for (const fac of activeFacilities) {
      const distance = getHaversineDistance(
        location.latitude,
        location.longitude,
        fac.latitude,
        fac.longitude
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestFacility = fac;
      }
    }

    // Calculate estimated walking time (assume 80 meters per minute)
    const walkingTimeMinutes = Math.max(1, Math.round(minDistance / 80));

    return res.status(200).json({
      success: true,
      data: {
        name: nearestFacility.name,
        description: nearestFacility.description,
        distance: minDistance,
        distanceFormatted: minDistance < 1000 
          ? `${Math.round(minDistance)}m` 
          : `${(minDistance / 1000).toFixed(1)}km`,
        walkingTime: walkingTimeMinutes,
        walkingTimeFormatted: `${walkingTimeMinutes} min${walkingTimeMinutes > 1 ? 's' : ''}`,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all facilities (Search, Filter, Paginated, Excluding Soft-Deleted)
 * GET /api/medical
 */
export const getMedicalCenters = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  const type = req.query.type;
  const skip = (page - 1) * limit;

  try {
    const query = { deletedAt: null };
    if (type) {
      query.type = type;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const facilities = await Facility.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 });

    const total = await Facility.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: facilities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new facility
 * POST /api/medical
 */
export const createMedicalCenter = async (req, res, next) => {
  const { name, latitude, longitude, description, type, status } = req.body;

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
    const newFacility = await Facility.create({
      name,
      latitude: latNum,
      longitude: lngNum,
      description: description || '',
      type: type || 'Medical',
      status: status === 'Inactive' ? 'Inactive' : 'Active',
    });

    return res.status(201).json({
      success: true,
      data: newFacility,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing facility
 * PUT /api/medical/:id
 */
export const updateMedicalCenter = async (req, res, next) => {
  const { id } = req.params;
  const { name, latitude, longitude, description, type, status } = req.body;

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
    const updatedFacility = await Facility.findOneAndUpdate(
      { _id: id },
      {
        name,
        latitude: latNum,
        longitude: lngNum,
        description: description || '',
        type: type || 'Medical',
        status: status === 'Inactive' ? 'Inactive' : 'Active',
      },
      { new: true }
    );

    if (!updatedFacility) {
      return res.status(404).json({ success: false, message: 'Facility not found.' });
    }

    return res.status(200).json({
      success: true,
      data: updatedFacility,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a facility (Soft Delete)
 * DELETE /api/medical/:id
 */
export const deleteMedicalCenter = async (req, res, next) => {
  const { id } = req.params;

  try {
    const deletedFacility = await Facility.findOneAndUpdate(
      { _id: id },
      { deletedAt: new Date() }
    );

    if (!deletedFacility) {
      return res.status(404).json({ success: false, message: 'Facility not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Facility deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};


