import mongoose from 'mongoose';
import { Location } from '../models/Location.js';
import { Facility } from '../models/Facility.js';

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
 * Fetch navigation coordinates, distance, and walking time between two locations.
 * GET /api/navigation?currentLocation=slug_or_id&destination=slug_or_id
 */
export const getNavigationDetails = async (req, res, next) => {
  const { currentLocation, destination } = req.query;

  if (!currentLocation || !destination) {
    return res.status(400).json({
      success: false,
      message: 'Both currentLocation and destination query parameters are required.',
    });
  }

  try {
    let startLoc = null;
    let endLoc = null;

    // 1. Resolve start location from DB safely
    const startConditions = [{ slug: currentLocation }];
    if (mongoose.Types.ObjectId.isValid(currentLocation)) {
      startConditions.push({ _id: currentLocation });
    }
    startLoc = await Location.findOne({ $or: startConditions });

    if (!startLoc) {
      return res.status(404).json({
        success: false,
        message: `Current Location '${currentLocation}' could not be resolved.`,
      });
    }

    // 2. Resolve destination location from DB (checking Facility or Location) safely
    const medConditions = [{ name: destination }];
    if (mongoose.Types.ObjectId.isValid(destination)) {
      medConditions.push({ _id: destination });
    }
    endLoc = await Facility.findOne({
      deletedAt: null,
      $or: medConditions
    });

    // If not found in Medical Center, check Location table
    if (!endLoc) {
      const destConditions = [{ slug: destination }];
      if (mongoose.Types.ObjectId.isValid(destination)) {
        destConditions.push({ _id: destination });
      }
      endLoc = await Location.findOne({ $or: destConditions });
    }

    if (!endLoc) {
      return res.status(404).json({
        success: false,
        message: `Destination '${destination}' could not be resolved.`,
      });
    }

    // 3. Calculate distance using Haversine Formula
    const distanceMeters = getHaversineDistance(
      startLoc.latitude,
      startLoc.longitude,
      endLoc.latitude,
      endLoc.longitude
    );

    // Calculate walking time (80 meters per minute)
    const walkingTimeMinutes = Math.max(1, Math.round(distanceMeters / 80));

    return res.status(200).json({
      success: true,
      data: {
        currentLocation: {
          name: startLoc.name,
          latitude: startLoc.latitude,
          longitude: startLoc.longitude,
        },
        destination: {
          name: endLoc.name,
          latitude: endLoc.latitude,
          longitude: endLoc.longitude,
        },
        distance: distanceMeters,
        distanceFormatted: distanceMeters < 1000 
          ? `${Math.round(distanceMeters)}m` 
          : `${(distanceMeters / 1000).toFixed(1)}km`,
        walkingTime: walkingTimeMinutes,
        walkingTimeFormatted: `${walkingTimeMinutes} min${walkingTimeMinutes > 1 ? 's' : ''}`,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ALL active facilities near a given gate location, with computed distances.
 * GET /api/facilities/near/:locationSlug
 * Returns all facilities sorted by distance from the specified location.
 */
export const getAllFacilitiesNear = async (req, res, next) => {
  const { locationSlug } = req.params;

  try {
    // 1. Resolve the gate location by slug
    const location = await Location.findOne({ slug: locationSlug });
    if (!location) {
      return res.status(404).json({
        success: false,
        message: `Location '${locationSlug}' not found.`,
      });
    }

    // 2. Fetch all active facilities
    const facilities = await Facility.find({ deletedAt: null, status: 'Active' });

    // 3. Compute distances and enrich each facility
    const enriched = facilities.map((f) => {
      const distanceMeters = getHaversineDistance(
        location.latitude,
        location.longitude,
        f.latitude,
        f.longitude
      );
      const walkingTimeMinutes = Math.max(1, Math.round(distanceMeters / 80));

      return {
        id: f._id.toString(),
        name: f.name,
        type: f.type,
        latitude: f.latitude,
        longitude: f.longitude,
        description: f.description || '',
        distance: distanceMeters,
        distanceFormatted:
          distanceMeters < 1000
            ? `${Math.round(distanceMeters)}m`
            : `${(distanceMeters / 1000).toFixed(1)}km`,
        walkingTime: walkingTimeMinutes,
        walkingTimeFormatted: `${walkingTimeMinutes} min${walkingTimeMinutes > 1 ? 's' : ''}`,
      };
    });

    // 4. Sort by distance (closest first)
    enriched.sort((a, b) => a.distance - b.distance);

    return res.status(200).json({
      success: true,
      location: {
        name: location.name,
        slug: location.slug,
        latitude: location.latitude,
        longitude: location.longitude,
      },
      facilities: enriched,
    });
  } catch (error) {
    next(error);
  }
};
