import mongoose from 'mongoose';
import { Location } from '../models/Location.js';
import { Facility } from '../models/Facility.js';
import { Category } from '../models/Category.js';

export const CATEGORY_SYNONYMS = {
  'Temple': ['Temple', 'Temples & Ghats', 'Mandir', 'Monastery', 'Worship', 'place_of_worship'],
  'Lost and Found': ['Lost and Found', 'Lost & Found', 'Bus Stand', 'Lost and Found Center'],
  'Drinking Water': ['Drinking Water', 'Water', 'Drinking water', 'Pyau'],
  'Restrooms': ['Restrooms', 'Toilet', 'Toilets', 'Restroom', 'Washroom'],
  'Medical': ['Medical', 'Hospital', 'Clinic', 'Pharmacy', 'First Aid', 'Doctor'],
  'Help Desk': ['Help Desk', 'Help', 'Information', 'Tourist Help', 'Tourist Information'],
  'Security': ['Security', 'Police', 'Police Station', 'Thana', 'Chowki'],
  'Parking': ['Parking', 'Parking Area', 'Car Park', 'Parking Stand'],
  'Food & Dining': ['Food & Dining', 'Food', 'Restaurant', 'Dining', 'Bhojanalaya']
};

const CATEGORY_OSM_KEYWORDS = {
  'Temple': 'temple',
  'Lost and Found': 'police',
  'Drinking Water': 'drinking water',
  'Restrooms': 'toilets',
  'Medical': 'hospital',
  'Help Desk': 'tourist information',
  'Security': 'police',
  'Parking': 'parking',
  'Food & Dining': 'restaurant'
};

// =========================================================================
// [PRESERVED]: Google Places API in-memory cache
// const googlePlacesCache = new Map();
// const GOOGLE_CACHE_TTL = 10 * 60 * 1000;
// =========================================================================

// In-memory cache for OpenStreetMap (OSM) / Nominatim queries (TTL: 15 minutes)
const osmCache = new Map();
const OSM_CACHE_TTL = 15 * 60 * 1000;
const googlePlacesCache = new Map();
const GOOGLE_CACHE_TTL = 10 * 60 * 1000;

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
  const { locationSlug } = req.params || {};
  const { lat, lng, category, q } = req.query || {};

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

    // 2. Fetch active facilities from DB & Locations (graceful fallback if DB is reconnecting)
    let dbFacilities = [];
    let dbLocations = [];

    if (mongoose.connection.readyState === 1) {
      const dbQuery = { deletedAt: null, status: 'Active' };
      if (category && category !== 'All') {
        const synonyms = CATEGORY_SYNONYMS[category] || [category];
        const regexList = synonyms.map((s) => new RegExp(`^${s}$`, 'i'));
        dbQuery.type = { $in: regexList };
      }
      if (q && q.trim()) {
        const regex = new RegExp(q.trim(), 'i');
        dbQuery.$or = [
          { name: regex },
          { type: regex },
          { description: regex },
          { address: regex }
        ];
      }
      dbFacilities = await Facility.find(dbQuery);

      if (q && q.trim()) {
        const locRegex = new RegExp(q.trim(), 'i');
        dbLocations = await Location.find({
          $or: [{ name: locRegex }, { description: locRegex }, { type: locRegex }]
        });
      }
    } else {
      console.warn('[Warning]: Database not ready. Serving OpenStreetMap live facilities.');
    }

    const enrichedDbFacilities = dbFacilities.map((f) => {
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

    const enrichedDbLocations = dbLocations.map((l) => {
      const distanceMeters = getHaversineDistance(
        origin.latitude,
        origin.longitude,
        l.latitude,
        l.longitude
      );
      const walkingTimeMinutes = Math.max(1, Math.round(distanceMeters / 80));

      return {
        id: `loc-${l._id.toString()}`,
        name: l.name,
        type: l.type || 'Temple',
        latitude: l.latitude,
        longitude: l.longitude,
        description: l.description || '',
        distance: distanceMeters,
        distanceFormatted:
          distanceMeters < 1000
            ? `${Math.round(distanceMeters)}m`
            : `${(distanceMeters / 1000).toFixed(1)}km`,
        walkingTime: walkingTimeMinutes,
        walkingTimeFormatted: `${walkingTimeMinutes} min${walkingTimeMinutes > 1 ? 's' : ''}`,
        source: 'db_location',
      };
    });

    const enrichedDb = [...enrichedDbFacilities, ...enrichedDbLocations];

    // =========================================================================
    // [PRESERVED]: GOOGLE PLACES API PROVIDER
    // To switch back to Google Places, uncomment this block and set GOOGLE_PLACES_API_KEY
    // =========================================================================
    /*
    let enrichedGoogle = [];
    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (googleApiKey) {
      try {
        let typeParam = '';
        let keywordParam = '';

        if (q && q.trim()) {
          const qLower = q.toLowerCase().trim();
          keywordParam = q.trim();
          if (qLower.includes('temple') || qLower.includes('mandir')) {
            typeParam = 'place_of_worship';
          } else if (qLower.includes('medical') || qLower.includes('hospital') || qLower.includes('clinic')) {
            typeParam = 'hospital';
          } else if (qLower.includes('police') || qLower.includes('security')) {
            typeParam = 'police';
          }
        } else if (category && category !== 'All') {
          const dbCat = await Category.findOne({ name: category, status: 'Active' });
          if (dbCat) {
            typeParam = dbCat.googleType || '';
            keywordParam = dbCat.keyword || '';
          } else {
            keywordParam = category;
          }
        } else {
          // General search
          keywordParam = 'temple|landmark|restaurant|hospital|toilet';
        }

        const cacheKey = `${origin.latitude.toFixed(3)},${origin.longitude.toFixed(3)}:${typeParam}:${keywordParam}`;
        const cached = googlePlacesCache.get(cacheKey);

        let googleResults = null;
        if (cached && (Date.now() - cached.timestamp < GOOGLE_CACHE_TTL)) {
          googleResults = cached.results;
        } else {
          let googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${origin.latitude},${origin.longitude}&radius=5000&key=${googleApiKey}`;
          if (typeParam) googleUrl += `&type=${typeParam}`;
          if (keywordParam) googleUrl += `&keyword=${encodeURIComponent(keywordParam)}`;

          const googleRes = await fetch(googleUrl);
          const googleData = await googleRes.json();
          if (googleData.results && Array.isArray(googleData.results)) {
            googleResults = googleData.results;
            if (googlePlacesCache.size > 200) {
              const oldestKey = googlePlacesCache.keys().next().value;
              googlePlacesCache.delete(oldestKey);
            }
            googlePlacesCache.set(cacheKey, { timestamp: Date.now(), results: googleResults });
          }
        }

        if (googleResults && Array.isArray(googleResults)) {
          enrichedGoogle = googleResults.map((place) => {
            const distanceMeters = getHaversineDistance(
              origin.latitude,
              origin.longitude,
              place.geometry.location.lat,
              place.geometry.location.lng
            );
            const walkingTimeMinutes = Math.max(1, Math.round(distanceMeters / 80));

            // Determine accurate facility type for Google Places results
            let inferredType = 'General';
            if (category && category !== 'All') {
              inferredType = category;
            } else if (q && q.trim()) {
              const qLower = q.toLowerCase().trim();
              if (qLower.includes('police') || qLower.includes('security') || qLower.includes('thana')) {
                inferredType = 'Police';
              } else if (qLower.includes('medical') || qLower.includes('hospital') || qLower.includes('clinic')) {
                inferredType = 'Medical';
              } else if (qLower.includes('toilet') || qLower.includes('restroom') || qLower.includes('washroom')) {
                inferredType = 'Toilet';
              } else if (qLower.includes('water')) {
                inferredType = 'Water';
              } else if (qLower.includes('parking') || qLower.includes('park')) {
                inferredType = 'Parking';
              } else if (qLower.includes('temple') || qLower.includes('mandir')) {
                inferredType = 'Temple';
              }
            }

            return {
              id: `google-${place.place_id}`,
              name: place.name,
              type: inferredType,
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
    */
    // =========================================================================

    // =========================================================================
    // [ACTIVE]: OPENSTREETMAP (OSM) / DB-PRIMARY PROVIDER
    // Leverages verified local database landmarks and enriches with OpenStreetMap
    // Nominatim / Overpass data with in-memory caching and safe timeout handling.
    // =========================================================================
    let enrichedOsm = [];
    const activeSearchQuery = (q && q.trim()) 
      ? q.trim() 
      : (category && category !== 'All') 
        ? (CATEGORY_OSM_KEYWORDS[category] || category) 
        : null;

    if (activeSearchQuery) {
      try {
        const osmQuery = encodeURIComponent(activeSearchQuery);
        const osmCacheKey = `${origin.latitude.toFixed(3)},${origin.longitude.toFixed(3)}:${osmQuery}`;
        const cachedOsm = osmCache.get(osmCacheKey);

        let osmResults = null;
        if (cachedOsm && Date.now() - cachedOsm.timestamp < OSM_CACHE_TTL) {
          osmResults = cachedOsm.results;
        } else {
          // Bounding box around Bodh Gaya (~10km)
          const minLon = origin.longitude - 0.08;
          const maxLat = origin.latitude + 0.08;
          const maxLon = origin.longitude + 0.08;
          const minLat = origin.latitude - 0.08;
          const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${osmQuery}&limit=10&addressdetails=1&viewbox=${minLon},${maxLat},${maxLon},${minLat}`;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);

          const osmRes = await fetch(osmUrl, {
            headers: {
              'User-Agent': 'BodhGaya-QRCode-Navigation/1.0',
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (osmRes.ok) {
            const osmData = await osmRes.json();
            if (Array.isArray(osmData)) {
              osmResults = osmData;
              if (osmCache.size > 200) {
                const oldestKey = osmCache.keys().next().value;
                osmCache.delete(oldestKey);
              }
              osmCache.set(osmCacheKey, { timestamp: Date.now(), results: osmResults });
            }
          }
        }

        if (osmResults && Array.isArray(osmResults)) {
          enrichedOsm = osmResults.map((place) => {
            const pLat = parseFloat(place.lat);
            const pLon = parseFloat(place.lon);
            const distanceMeters = getHaversineDistance(
              origin.latitude,
              origin.longitude,
              pLat,
              pLon
            );
            const walkingTimeMinutes = Math.max(1, Math.round(distanceMeters / 80));

            // Align type to requested category if explicitly selected
            const inferredType = (category && category !== 'All')
              ? category
              : place.type 
                ? (place.type.charAt(0).toUpperCase() + place.type.slice(1)) 
                : 'Landmark';

            return {
              id: `osm-${place.place_id || place.osm_id}`,
              name: place.name || (place.display_name ? place.display_name.split(',')[0] : 'Landmark'),
              type: inferredType,
              latitude: pLat,
              longitude: pLon,
              description: place.display_name || '',
              distance: distanceMeters,
              distanceFormatted:
                distanceMeters < 1000
                  ? `${Math.round(distanceMeters)}m`
                  : `${(distanceMeters / 1000).toFixed(1)}km`,
              walkingTime: walkingTimeMinutes,
              walkingTimeFormatted: `${walkingTimeMinutes} min${walkingTimeMinutes > 1 ? 's' : ''}`,
              source: 'osm',
            };
          });
        }
      } catch (osmErr) {
        // Graceful fallback to verified DB records if network is offline or throttled
      }
    }

    // 4. Merge results & sort by distance
    // [PRESERVED: Google Places Merge]: const merged = [...enrichedDb, ...enrichedGoogle];
    const merged = [...enrichedDb, ...enrichedOsm];
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
