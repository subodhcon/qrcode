import mongoose from 'mongoose';
import { Location } from '../models/Location.js';
import { Facility } from '../models/Facility.js';
import { Category } from '../models/Category.js';

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
  const { lat, lng, category } = req.query;

  try {
    let origin = null;

    // 1. Resolve origin (either from GPS query parameters or gate slug)
    if (lat && lng) {
      origin = {
        name: 'Current Location',
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
      };
    } else if (locationSlug) {
      const location = await Location.findOne({ slug: locationSlug });
      if (!location) {
        return res.status(404).json({
          success: false,
          message: `Location '${locationSlug}' not found.`,
        });
      }
      origin = {
        name: location.name,
        slug: location.slug,
        latitude: location.latitude,
        longitude: location.longitude,
      };
    }

    if (!origin) {
      return res.status(400).json({
        success: false,
        message: 'Either lat/lng query parameters or locationSlug URL parameter is required.',
      });
    }

    // 2. Fetch active facilities from DB
    const dbQuery = { deletedAt: null, status: 'Active' };
    if (category && category !== 'All') {
      dbQuery.type = category;
    }
    const dbFacilities = await Facility.find(dbQuery);

    const enrichedDb = dbFacilities.map((f) => {
      const distanceMeters = getHaversineDistance(
        origin.latitude,
        origin.longitude,
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
        source: 'db',
      };
    });

    // 3. Fetch facilities from Google Places API (if key available)
    let enrichedGoogle = [];
    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (googleApiKey) {
      try {
        let typeParam = '';
        let keywordParam = '';

        if (category && category !== 'All') {
          const dbCat = await Category.findOne({ name: category, status: 'Active' });
          if (dbCat) {
            typeParam = dbCat.googleType || '';
            keywordParam = dbCat.keyword || '';
          } else {
            keywordParam = category;
          }
        } else {
          // General search
          keywordParam = 'landmark|restaurant|hospital|toilet';
        }


        let googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${origin.latitude},${origin.longitude}&radius=2000&key=${googleApiKey}`;
        if (typeParam) googleUrl += `&type=${typeParam}`;
        if (keywordParam) googleUrl += `&keyword=${encodeURIComponent(keywordParam)}`;

        const googleRes = await fetch(googleUrl);
        const googleData = await googleRes.json();

        if (googleData.results && Array.isArray(googleData.results)) {
          enrichedGoogle = googleData.results.map((place) => {
            const distanceMeters = getHaversineDistance(
              origin.latitude,
              origin.longitude,
              place.geometry.location.lat,
              place.geometry.location.lng
            );
            const walkingTimeMinutes = Math.max(1, Math.round(distanceMeters / 80));

            return {
              id: `google-${place.place_id}`,
              name: place.name,
              type: category || 'General',
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
              description: place.vicinity || '',
              distance: distanceMeters,
              distanceFormatted:
                distanceMeters < 1000
                  ? `${Math.round(distanceMeters)}m`
                  : `${(distanceMeters / 1000).toFixed(1)}km`,
              walkingTime: walkingTimeMinutes,
              walkingTimeFormatted: `${walkingTimeMinutes} min${walkingTimeMinutes > 1 ? 's' : ''}`,
              source: 'google',
            };
          });
        }
      } catch (err) {
        console.error('Error fetching Google Places:', err);
      }
    }

    // 4. Merge results & sort by distance
    const merged = [...enrichedDb, ...enrichedGoogle];
    merged.sort((a, b) => a.distance - b.distance);

    return res.status(200).json({
      success: true,
      location: origin,
      facilities: merged,
    });
  } catch (error) {
    next(error);
  }
};
