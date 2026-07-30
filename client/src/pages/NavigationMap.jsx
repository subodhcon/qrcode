import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import Loading from '../components/Loading';
import { useTranslation } from '../context/LanguageContext';

// Map Style Switcher options for Google Maps
const MAP_TYPES = [
  { key: 'roadmap', label: 'Standard Map', icon: '🗺️' },
  { key: 'satellite', label: 'Satellite', icon: '🛰️' },
  { key: 'hybrid', label: 'Hybrid', icon: '🌲' },
];
// Haversine distance helper in meters
const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function NavigationMap() {
  const { locationId } = useParams();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const destinationParam = searchParams.get('destination');

  // API Key state
  const [googleMapsKey, setGoogleMapsKey] = useState(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || null);

  // Refs for Google Map instances
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const userCircleRef = useRef(null);
  const hasCenteredRef = useRef(false);
  const lastFetchedCoordsRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const lastRoutedCoordsRef = useRef(null);
  const lastRouteTimeRef = useRef(0);

  // State
  const [categories, setCategories] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [routeError, setRouteError] = useState(null);

  // Geolocation & Map State
  const [gpsPosition, setGpsPosition] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [heading, setHeading] = useState(0);
  const prevGpsPositionRef = useRef(null);
  const categoryParam = searchParams.get('category');
  const queryParam = searchParams.get('q');

  // State
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || 'All');
  const [searchQuery, setSearchQuery] = useState(queryParam || '');
  const [mapType, setMapType] = useState('roadmap');
  const [showSteps, setShowSteps] = useState(false);
  const [navigationSteps, setNavigationSteps] = useState([]);
  const [distanceText, setDistanceText] = useState('');
  const [durationText, setDurationText] = useState('');
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [showStatus, setShowStatus] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showMapTypes, setShowMapTypes] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [liveAddress, setLiveAddress] = useState('Gaya Ji, Bihar, India');

  // Active Origin coordinate
  const activeOrigin = useMemo(() => {
    if (gpsPosition) {
      return {
        latitude: gpsPosition.latitude,
        longitude: gpsPosition.longitude,
        name: 'My Live GPS Location',
      };
    }
    return null;
  }, [gpsPosition]);

  // Sync URL search parameters (category, q) to component state
  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
    if (queryParam !== null && queryParam !== undefined) {
      setSearchQuery(queryParam);
    }
  }, [categoryParam, queryParam]);

  // Show status bar permanently when no destination is selected
  useEffect(() => {
    if (loading || !scriptLoaded) {
      setShowStatus(false);
      return;
    }
    setShowStatus(true);
  }, [loading, scriptLoaded]);

  // Fetch Google Maps API Key from backend if not set in client env
  useEffect(() => {
    if (googleMapsKey) return;
    const fetchMapsKey = async () => {
      try {
        const res = await api.get('/config/maps-key');
        if (res.key) {
          setGoogleMapsKey(res.key);
        } else {
          setError('Google Maps API key is missing on the server.');
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load Google Maps key:', err);
        setError('Failed to fetch Google Maps configuration from server.');
        setLoading(false);
      }
    };
    fetchMapsKey();
  }, [googleMapsKey]);

  // 1. Log QR scan event on mount
  useEffect(() => {
    const logScan = async () => {
      try {
        await api.post('/analytics/scan');
      } catch (err) {
        console.warn('Failed to log scan telemetry:', err);
      }
    };
    logScan();
  }, []);

  // 2. Fetch categories from backend on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        // Filter only active categories
        const activeCats = (res.data || []).filter(c => c.status === 'Active');
        setCategories(activeCats);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // 3. Check Geolocation on Mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;

        setGpsPosition({
          latitude: newLat,
          longitude: newLng,
          accuracy: pos.coords.accuracy,
        });

        // Compute heading
        if (pos.coords.heading !== null && pos.coords.heading !== undefined) {
          setHeading(pos.coords.heading);
        } else if (prevGpsPositionRef.current) {
          const from = prevGpsPositionRef.current;
          const to = { latitude: newLat, longitude: newLng };
          const dLat = to.latitude - from.latitude;
          const dLng = to.longitude - from.longitude;

          // Distance threshold to avoid tiny coordinate jitter/compass noise
          if (Math.abs(dLat) > 0.00001 || Math.abs(dLng) > 0.00001) {
            const lat1 = (from.latitude * Math.PI) / 180;
            const lon1 = (from.longitude * Math.PI) / 180;
            const lat2 = (to.latitude * Math.PI) / 180;
            const lon2 = (to.longitude * Math.PI) / 180;
            const dLon = lon2 - lon1;
            const y = Math.sin(dLon) * Math.cos(lat2);
            const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
            let brng = Math.atan2(y, x);
            brng = (brng * 180) / Math.PI;
            setHeading((brng + 360) % 360);
          }
        }
        prevGpsPositionRef.current = { latitude: newLat, longitude: newLng };
        setGpsError(null);
        setError(null);
      },
      (err) => {
        console.warn('GPS Error:', err);
        setGpsError('GPS access is blocked or timed out.');
        setError('Geolocation access is required to use this map. Please enable location permissions in your browser or device settings.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // 3a. Device orientation listener to rotate compass arrow on compatible phones
  useEffect(() => {
    const handleOrientation = (e) => {
      // webkitCompassHeading is supported on iOS Safari.
      // e.alpha with absolute orientation is supported on Android Chrome.
      const compassHeading = e.webkitCompassHeading || (e.alpha ? 360 - e.alpha : null);
      if (compassHeading !== null && compassHeading !== undefined) {
        setHeading(compassHeading);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  // 4. Load Google Maps script dynamically
  useEffect(() => {
    if (!googleMapsKey) {
      return;
    }

    if (window.google && window.google.maps && window.google.maps.Map) {
      setScriptLoaded(true);
      return;
    }

    const scriptId = 'google-maps-script';
    const existingScript = document.getElementById(scriptId);

    if (!existingScript) {
      window.initGoogleMaps = () => {
        setScriptLoaded(true);
      };
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}&libraries=places&loading=async&callback=initGoogleMaps`;
      script.id = scriptId;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        setError('Failed to load Google Maps script. Check your API key.');
        setLoading(false);
      };
      document.body.appendChild(script);
    } else {
      // If script tag already exists, poll until window.google.maps.Map is fully loaded
      const interval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.Map) {
          setScriptLoaded(true);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [googleMapsKey]);

  // 4b. Reverse Geocode active GPS coordinates into physical address
  useEffect(() => {
    if (!scriptLoaded || !activeOrigin) return;
    const lat = activeOrigin.latitude;
    const lng = activeOrigin.longitude;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        setLiveAddress(results[0].formatted_address);
      } else {
        console.warn('Geocoder failed due to:', status);
      }
    });
  }, [scriptLoaded, activeOrigin]);

  // 5. Fetch facilities near User's GPS or Scanned Location Slug
  useEffect(() => {
    const fetchFacilities = async () => {
      // Don't start loading until we have GPS coordinates
      if (!gpsPosition) {
        return;
      }

      // Check if coordinates, category, or search query changed to bypass cached fetch
      const hasCategoryChanged = lastFetchedCoordsRef.current?.category !== selectedCategory;
      const hasSearchChanged = lastFetchedCoordsRef.current?.searchQuery !== searchQuery;
      const isInitialFetch = !lastFetchedCoordsRef.current;

      let isFarEnough = false;
      if (lastFetchedCoordsRef.current) {
        const dLat = gpsPosition.latitude - lastFetchedCoordsRef.current.latitude;
        const dLng = gpsPosition.longitude - lastFetchedCoordsRef.current.longitude;
        // 0.0005 degrees is approx 50 meters
        if (Math.abs(dLat) > 0.0005 || Math.abs(dLng) > 0.0005) {
          isFarEnough = true;
        }
      }

      if (!isInitialFetch && !hasCategoryChanged && !hasSearchChanged && !isFarEnough) {
        return;
      }

      try {
        const params = {
          category: selectedCategory,
          q: searchQuery.trim() || undefined,
          lat: gpsPosition.latitude,
          lng: gpsPosition.longitude
        };

        const res = await api.get('/facilities/near', { params });
        setFacilities(res.facilities || []);

        lastFetchedCoordsRef.current = {
          latitude: gpsPosition.latitude,
          longitude: gpsPosition.longitude,
          category: selectedCategory,
          searchQuery: searchQuery
        };

        // Auto-select destination from query parameter if matches
        if (destinationParam && res.facilities) {
          const match = res.facilities.find(
            (f) => f.name.toLowerCase() === destinationParam.toLowerCase() || f.id === destinationParam
          );
          if (match) setSelectedFacility(match);
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching map data:', err);
        setError(err.response?.data?.message || 'Failed to load nearby facilities.');
      } finally {
        setLoading(false);
      }
    };

    fetchFacilities();
  }, [gpsPosition, selectedCategory, searchQuery, destinationParam]);


  // 6. Initialize Google Map Instance
  useEffect(() => {
    if (!scriptLoaded || !mapRef.current || !activeOrigin) return;

    if (!mapInstanceRef.current) {
      // Create new Google Map
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: activeOrigin.latitude, lng: activeOrigin.longitude },
        zoom: 17,
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        gestureHandling: 'greedy',
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }],
          },
        ],
      });

      // Setup directions
      directionsServiceRef.current = new window.google.maps.DirectionsService();
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map: mapInstanceRef.current,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#10b981',
          strokeWeight: 6,
          strokeOpacity: 0.85,
        },
      });
      hasCenteredRef.current = true;
    } else if (!hasCenteredRef.current) {
      mapInstanceRef.current.setCenter({ lat: activeOrigin.latitude, lng: activeOrigin.longitude });
      hasCenteredRef.current = true;
    }
  }, [scriptLoaded, activeOrigin]);

  // 7. Update Map Type
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setMapTypeId(mapType);
    }
  }, [mapType]);

  // Compute nearest services dynamically from local facilities array
  const nearestServices = useMemo(() => {
    const getNearest = (type) => {
      const filtered = facilities.filter(f => f.type === type);
      if (filtered.length === 0) return null;
      return filtered[0]; // Facilities list is already sorted by proximity from backend
    };
    return {
      Police: getNearest('Police'),
      Medical: getNearest('Medical'),
      Toilet: getNearest('Toilet'),
      Help: getNearest('Help')
    };
  }, [facilities]);

  // Filter facilities by search query strictly (matches name, category type, address, or description)
  const filteredFacilities = useMemo(() => {
    if (!searchQuery.trim()) return facilities;
    const q = searchQuery.toLowerCase().trim();
    return facilities.filter((f) => {
      const name = (f.name || '').toLowerCase();
      const type = (f.type || '').toLowerCase();
      const addr = (f.address || '').toLowerCase();
      const desc = (f.description || '').toLowerCase();

      if (name.includes(q) || type.includes(q) || addr.includes(q) || desc.includes(q)) return true;
      if (q === 'temple' && (name.includes('mandir') || type === 'temple')) return true;
      if (q === 'police' && (name.includes('thana') || name.includes('outpost') || type === 'police')) return true;
      if (q === 'medical' && (name.includes('hospital') || name.includes('clinic') || type === 'medical')) return true;
      return false;
    });
  }, [facilities, searchQuery]);

  // 8a. Draw & Update User Location Marker (Navigation Arrow)
  useEffect(() => {
    if (!scriptLoaded || !mapInstanceRef.current || !activeOrigin) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
      if (userCircleRef.current) {
        userCircleRef.current.setMap(null);
        userCircleRef.current = null;
      }
      return;
    }

    const map = mapInstanceRef.current;
    const position = { lat: activeOrigin.latitude, lng: activeOrigin.longitude };

    // Beautiful navigation wedge SVG pointing UP
    const arrowIcon = {
      path: 'M 0,-12 L 8,8 L 3,5 L -3,5 L -8,8 Z',
      fillColor: '#3b82f6',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 1.6, // slightly larger for visibility
      rotation: heading || 0,
      anchor: new window.google.maps.Point(0, 0),
    };

    if (!userMarkerRef.current) {
      userMarkerRef.current = new window.google.maps.Marker({
        position,
        map,
        title: t('youAreHere'),
        icon: arrowIcon,
      });

      const userInfoWindow = new window.google.maps.InfoWindow({
        content: `<div style="font-family: system-ui, -apple-system, sans-serif; padding: 2px 4px; min-width: 100px; text-align: left;">
          <div style="font-size: 11px; font-weight: 850; color: #0f172a; display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
            <span style="font-size: 12px;">📍</span> ${t('youAreHere')}
          </div>
          <div style="font-size: 8px; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 2px 6px; border-radius: 5px; display: inline-flex; align-items: center; gap: 3px;">
            <span style="width: 4px; height: 4px; background: #3b82f6; border-radius: 50%;"></span>
            Accuracy: ±${Math.round(gpsPosition?.accuracy || 0)}m
          </div>
        </div>`,
      });

      userMarkerRef.current.addListener('click', () => {
        userInfoWindow.open(map, userMarkerRef.current);
      });

      // Auto-open "You are here" InfoWindow popup by default on map load
      userInfoWindow.open(map, userMarkerRef.current);
    } else {
      userMarkerRef.current.setPosition(position);
      userMarkerRef.current.setIcon(arrowIcon);
    }

    // Dynamic accuracy circle (representing the blue halo in Google Maps) - capped to max 30m for visual neatness
    const accuracyRadius = Math.min(gpsPosition?.accuracy || 15, 30);
    if (!userCircleRef.current) {
      userCircleRef.current = new window.google.maps.Circle({
        map,
        center: position,
        radius: accuracyRadius,
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        strokeColor: '#3b82f6',
        strokeOpacity: 0.35,
        strokeWeight: 1.5,
        clickable: false
      });
    } else {
      userCircleRef.current.setCenter(position);
      userCircleRef.current.setRadius(accuracyRadius);
    }

    if (selectedFacility && isNavigating) {
      // Auto-zoom to highly detailed walking scale (19) and center-lock position with standard navigation offset
      map.setZoom(19);
      const latOffset = 0.08 / Math.pow(2, 19 - 10);
      map.setCenter({ lat: position.lat - latOffset, lng: position.lng });
    }
  }, [scriptLoaded, activeOrigin, heading, gpsPosition?.accuracy, selectedFacility, isNavigating, t]);

  // 8b. Draw Facilities Markers
  useEffect(() => {
    if (!scriptLoaded || !mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const map = mapInstanceRef.current;

    filteredFacilities.forEach((fac) => {
      const typeLower = (fac.type || '').toLowerCase();
      const nameLower = (fac.name || '').toLowerCase();
      const descLower = (fac.description || '').toLowerCase();
      const combined = `${typeLower} ${nameLower} ${descLower}`;

      let emoji = null;

      // Helper regex check for whole word / clean matching
      const hasWord = (term) => new RegExp(`\\b${term}\\b`, 'i').test(combined);

      if (typeLower === 'police' || hasWord('police') || hasWord('thana') || hasWord('outpost') || hasWord('security')) {
        emoji = '🛡️';
      } else if (typeLower === 'medical' || typeLower === 'hospital' || hasWord('hospital') || hasWord('medical') || hasWord('clinic') || hasWord('doctor') || hasWord('pharmacy')) {
        emoji = '🏥';
      } else if (typeLower === 'toilet' || typeLower === 'restroom' || hasWord('toilet') || hasWord('restroom') || hasWord('washroom')) {
        emoji = '🚻';
      } else if (typeLower === 'water' || hasWord('water') || hasWord('drinking')) {
        emoji = '💧';
      } else if (typeLower === 'parking' || hasWord('parking')) {
        emoji = '🅿️';
      } else if (typeLower === 'temple' || hasWord('temple') || hasWord('mandir') || hasWord('ghat') || hasWord('worship')) {
        emoji = '🛕';
      } else if (typeLower === 'transport' || hasWord('bus') || hasWord('railway') || hasWord('station')) {
        emoji = '🚌';
      } else if (hasWord('restaurant') || hasWord('food') || hasWord('hotel') || hasWord('cafe') || hasWord('bhojanalaya')) {
        emoji = '🍽️';
      } else {
        const catConfig = categories.find(c => c.name.toLowerCase() === typeLower);
        emoji = catConfig?.emoji || '📍';
      }

      const color = '#10b981';
      const isSelected = selectedFacility && selectedFacility.id === fac.id;

      const marker = new window.google.maps.Marker({
        position: { lat: fac.latitude, lng: fac.longitude },
        map,
        title: fac.name,
        label: {
          text: emoji,
          fontSize: isSelected ? '22px' : '18px',
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 20 : 16,
          fillColor: '#ffffff',
          fillOpacity: 0.95,
          strokeColor: color,
          strokeWeight: 3,
        },
      });

      const displayCategory = fac.type && fac.type !== 'General' ? fac.type : 'Location';

      const infoContent = `
        <div style="font-family: sans-serif; padding: 6px; min-width: 140px; color: #0f172a;">
          <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: ${color}; margin-bottom: 2px;">
            ${emoji} ${displayCategory}
          </div>
          <div style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">${fac.name}</div>
          <div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">
            Distance: ${fac.distanceFormatted}
          </div>
          ${isSelected
          ? '<span style="font-size:10px;font-weight:bold;color:#10b981;">✓ Selected Destination</span>'
          : `<button id="nav-btn-${fac.id}" style="background-color:${color};color:#ffffff;border:none;padding:5px 10px;font-size:10px;font-weight:bold;border-radius:4px;cursor:pointer;width:100%;">Navigate Here</button>`
        }
        </div>
      `;

      const infoWindow = new window.google.maps.InfoWindow({
        content: infoContent,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);

        // Bind navigation click event inside popup dynamically
        window.google.maps.event.addListener(infoWindow, 'domready', () => {
          const btn = document.getElementById(`nav-btn-${fac.id}`);
          if (btn) {
            btn.onclick = () => {
              handleNavigateTo(fac);
              infoWindow.close();
            };
          }
        });
      });

      markersRef.current.push(marker);
    });

    // Auto-fit bounds if we have points and no active navigation path
    if (filteredFacilities.length > 0 && !selectedFacility) {
      const bounds = new window.google.maps.LatLngBounds();
      if (activeOrigin) {
        bounds.extend({ lat: activeOrigin.latitude, lng: activeOrigin.longitude });
      }
      filteredFacilities.forEach((fac) => {
        bounds.extend({ lat: fac.latitude, lng: fac.longitude });
      });
      map.fitBounds(bounds, 50);
    }
  }, [scriptLoaded, filteredFacilities, selectedFacility, categories]);

  // 9. Calculate Walking Directions (Optimized)
  useEffect(() => {
    if (!scriptLoaded || !directionsRendererRef.current || !directionsServiceRef.current || !activeOrigin || !selectedFacility) {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections({ routes: [] });
      }
      return;
    }

    const now = Date.now();
    const timeElapsed = now - lastRouteTimeRef.current;

    let isFarEnough = true;
    if (lastRoutedCoordsRef.current) {
      const distance = getHaversineDistance(
        activeOrigin.latitude,
        activeOrigin.longitude,
        lastRoutedCoordsRef.current.latitude,
        lastRoutedCoordsRef.current.longitude
      );
      // Skip updates if user has moved less than 8 meters
      if (distance < 8) {
        isFarEnough = false;
      }
    }

    // Force call if the selected facility has changed
    const hasDestinationChanged =
      !lastRoutedCoordsRef.current ||
      lastRoutedCoordsRef.current.destinationId !== (selectedFacility._id || selectedFacility.id) ||
      lastRoutedCoordsRef.current.destinationName !== selectedFacility.name;

    // Only skip if the destination is the same, user hasn't moved far enough, AND it's been less than 10 seconds
    if (!hasDestinationChanged && !isFarEnough && timeElapsed < 10000) {
      return;
    }

    directionsServiceRef.current.route(
      {
        origin: { lat: activeOrigin.latitude, lng: activeOrigin.longitude },
        destination: { lat: selectedFacility.latitude, lng: selectedFacility.longitude },
        travelMode: window.google.maps.TravelMode.WALKING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          directionsRendererRef.current.setDirections(result);

          const leg = result.routes[0].legs[0];
          setDistanceText(leg.distance.text);
          setDurationText(leg.duration.text);
          setNavigationSteps(leg.steps);
          setRouteError(null);

          // Update tracking refs on successful route calculation
          lastRoutedCoordsRef.current = {
            latitude: activeOrigin.latitude,
            longitude: activeOrigin.longitude,
            destinationId: selectedFacility._id || selectedFacility.id,
            destinationName: selectedFacility.name,
          };
          lastRouteTimeRef.current = Date.now();
        } else {
          console.error('Directions request failed:', status);
          setRouteError('Could not calculate walking path to this destination.');
        }
      }
    );
  }, [scriptLoaded, activeOrigin, selectedFacility]);

  // Navigation click handler
  const handleNavigateTo = async (facility) => {
    setSelectedFacility(facility);
    setIsNavigating(false);
    setSearchParams({ destination: facility.name });

    // Log telemetry click count to backend
    try {
      await api.post('/analytics/click', { category: facility.type });
    } catch (err) {
      console.warn('Failed to log click telemetry:', err);
    }
  };

  // Recenter map to origin and force fetch facilities around current coordinates
  const handleRecenter = () => {
    if (mapInstanceRef.current && activeOrigin) {
      const map = mapInstanceRef.current;
      const zoom = 17;
      map.setZoom(zoom);

      const latOffset = selectedFacility ? 0.08 / Math.pow(2, zoom - 10) : 0;
      map.setCenter({ lat: activeOrigin.latitude - latOffset, lng: activeOrigin.longitude });

      // Clear cache to force a fresh fetch call in useEffect
      lastFetchedCoordsRef.current = null;
      setGpsPosition({ ...gpsPosition });
    }
  };

  // Missing API Key warning UI
  if (!googleMapsKey && !loading) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white border border-amber-300/40 rounded-2xl p-8 text-center shadow-xl">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Google Maps API Key Missing</h2>
        <p className="text-slate-600 text-sm mb-6">
          To run this dynamic real-time map, configure <code className="bg-slate-100 px-1 py-0.5 rounded text-amber-600">VITE_GOOGLE_MAPS_API_KEY</code> in your client's environment variables.
        </p>
      </div>
    );
  }

  /* ── Error ── */
  if (error && !activeOrigin) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white border border-red-300/40 rounded-2xl p-8 text-center shadow-xl">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Map Error</h2>
        <p className="text-slate-600 text-sm mb-6">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden flex flex-col animate-fade-in">

      {/* ── Loading Overlay ── */}
      {(loading || !scriptLoaded) && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/85 backdrop-blur-md">
          <Loading message={t('loadingLocation')} />
        </div>
      )}

      {/* ── Top Turn-by-Turn Header (When Navigating) ── */}
      {selectedFacility && isNavigating && (
        <div className="absolute top-0 left-0 right-0 z-40 text-white px-3 py-2.5 sm:px-4 sm:py-3 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3" style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', borderBottom: '1px solid rgba(52,211,153,0.3)' }}>
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/12 border border-white/15 flex items-center justify-center text-base sm:text-xl shrink-0">
              🚶
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-emerald-100/80 flex items-center gap-1 sm:gap-1.5 flex-wrap">
                <span>{t('navMode')}</span>
                <span className="opacity-40">·</span>
                <span>{durationText || t('calculating')} {t('walk')}</span>
              </p>
              <h3 className="text-xs sm:text-sm font-black text-white truncate leading-tight mt-0.5">
                {t('routeTo')} {selectedFacility.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="py-1 px-2.5 sm:py-1.5 sm:px-3 rounded-lg sm:rounded-xl bg-slate-950/40 hover:bg-slate-950/60 text-white font-bold text-[10px] sm:text-xs shadow transition-all border border-white/20 cursor-pointer flex items-center gap-1"
            >
              <span>📋</span>
              <span className="hidden xs:inline">{t('steps')}</span>
            </button>
            <button
              onClick={() => {
                setSelectedFacility(null);
                setSearchParams({});
                setNavigationSteps([]);
                setShowSteps(false);
                setRouteError(null);
                setIsNavigating(false);
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-950/40 hover:bg-slate-950/70 text-white font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
              title={t('exitNav')}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Top Controls Panel (Search & Categories - Overview mode only) ── */}
      {!selectedFacility && (
        <div className="absolute top-3 inset-x-3 z-30 flex flex-col items-center gap-2 pointer-events-none">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pointer-events-auto w-full max-w-xl">
            
            {/* Top Bar with Back Button & Search Input */}
            <div className="flex items-center gap-2 w-full">
              {/* Back to Welcome Page Button */}
              <Link
                to="/welcome"
                className="w-9 h-9 rounded-2xl border border-slate-200/80 bg-white/95 hover:bg-white text-slate-700 flex items-center justify-center shadow-md backdrop-blur-md transition-all active:scale-95 cursor-pointer shrink-0"
                title="Back to Welcome Page"
              >
                <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>

              {/* Search Input */}
              <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200/80 px-3 py-1.5 shadow-md bg-white/95 backdrop-blur-md flex-1">
                <input
                  id="search-input"
                  name="search"
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-slate-900 text-xs font-medium placeholder-slate-400 focus:outline-none w-full"
                />
                {searchQuery ? (
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setSearchParams({});
                    }} 
                    className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all text-[11px] font-bold flex items-center justify-center cursor-pointer shrink-0"
                    title="Clear search"
                  >
                    ✕
                  </button>
                ) : (
                  <span className="text-slate-400 text-xs">🔍</span>
                )}
              </div>
            </div>

            {/* Dynamic Category Filter Pills */}
            <div className="flex items-center gap-1.5 no-scrollbar overflow-x-auto w-full max-w-[90vw] sm:max-w-md py-0.5">
              <button
                onClick={() => { setSelectedCategory('All'); setSearchQuery(''); setSearchParams({}); }}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap cursor-pointer border transition-all active:scale-95 ${ (selectedCategory === 'All' && !searchQuery)
                    ? 'bg-emerald-500 text-white border-emerald-400 font-extrabold shadow-lg shadow-emerald-500/20'
                    : 'border-slate-200 text-slate-600 hover:text-slate-900 bg-white/95 backdrop-blur-md'
                  }`}
              >
                🌐 {t('all')}
              </button>
              {categories.map((cat) => {
                const isSel = selectedCategory === cat.name || searchQuery.toLowerCase().trim() === cat.name.toLowerCase();
                return (
                  <button
                    key={cat._id || cat.id}
                    onClick={() => { setSelectedCategory(cat.name); setSearchQuery(''); setSearchParams({ category: cat.name }); }}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap cursor-pointer border transition-all active:scale-95 flex items-center gap-1 ${isSel
                        ? 'bg-emerald-500 text-white border-emerald-400 font-extrabold shadow-lg shadow-emerald-500/20'
                        : 'border-slate-200 text-slate-600 hover:text-slate-900 bg-white/95 backdrop-blur-md'
                      }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{t(cat.name) || cat.name}</span>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Empty Search Results Soft Toast Banner */}
          {!loading && searchQuery.trim() && filteredFacilities.length === 0 && (
            <div className="pointer-events-auto mt-2 bg-white/95 border border-amber-300/80 rounded-2xl p-3 shadow-xl backdrop-blur-md text-center max-w-md w-full animate-fade-in flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 text-left">
                <span className="text-base">⚠️</span>
                <span>No places found for "{searchQuery}"</span>
              </div>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchParams({});
                }}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-extrabold cursor-pointer transition-all active:scale-95 shrink-0"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step-by-Step Navigation Instructions Drawer ── */}
      {showSteps && selectedFacility && navigationSteps.length > 0 && (
        <div className="absolute inset-x-3 bottom-28 z-50 max-w-sm mx-auto rounded-3xl p-5 shadow-2xl space-y-4" style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(226,232,240,0.9)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>📋 {t('stepByStepDirections')}</span>
            </h4>
            <button
              onClick={() => setShowSteps(false)}
              className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {navigationSteps.map((step, index) => (
              <div key={index} className="flex items-start gap-3 text-xs text-slate-600">
                <span className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800" dangerouslySetInnerHTML={{ __html: step.instructions }} />
                  <p className="text-[10px] text-slate-500 mt-0.5">{step.distance.text} · {step.duration.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Google Map Container ── */}
      <div ref={mapRef} className="flex-1 w-full h-full relative z-10" />

      {/* ── Floating Map Control Stack (Bottom Right) ── */}
      <div className={`absolute ${(selectedFacility || (showStatus && activeOrigin)) ? 'bottom-[180px]' : 'bottom-4'} right-3 z-30 flex flex-col gap-1.5 transition-all duration-300 items-end`}>
        {/* Floating SOS Button */}
        <button
          onClick={() => setSosActive(true)}
          className="h-8 px-2.5 rounded-lg text-xs font-black flex items-center gap-1 shadow-md bg-red-500 hover:bg-red-600 text-white backdrop-blur-md cursor-pointer transition-all active:scale-95 shadow-red-500/20"
          title="Emergency SOS"
        >
          <span>🚨</span>
          <span className="text-[10px]">SOS</span>
        </button>

        {/* Recenter Floating Button */}
        <button
          onClick={handleRecenter}
          className="w-8 h-8 rounded-lg text-sm flex items-center justify-center shadow-md bg-white/95 border border-slate-200/80 text-emerald-600 backdrop-blur-md cursor-pointer transition-all active:scale-95 hover:bg-white"
          title={t('recenterMap')}
        >
          🎯
        </button>

        {/* Map Type Expansion Wrapper */}
        <div className="flex items-center gap-1.5">
          {/* Expanded Map Types Menu (Slides out to the left) */}
          {showMapTypes && (
            <div className="flex gap-1 bg-white/95 border border-slate-200/80 p-1 rounded-lg shadow-lg backdrop-blur-md animate-fade-in mr-0.5">
              {MAP_TYPES.map((type) => {
                const isSelected = mapType === type.key;
                const labelText = type.label === 'Standard Map' ? 'Map' : type.label;
                return (
                  <button
                    key={type.key}
                    onClick={() => {
                      setMapType(type.key);
                      setShowMapTypes(false);
                    }}
                    className={`px-2 py-1 rounded-md text-[9px] font-black transition-all active:scale-95 border flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs">{type.icon}</span>
                    <span>{labelText}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Arrow Toggle Button */}
          <button
            onClick={() => setShowMapTypes(!showMapTypes)}
            className={`w-8 h-8 rounded-lg text-xs font-black flex items-center justify-center shadow-md border backdrop-blur-md cursor-pointer transition-all active:scale-95 ${
              showMapTypes
                ? 'bg-emerald-500 text-white border-emerald-400'
                : 'bg-white/95 text-slate-600 border-slate-200/80 hover:bg-white'
            }`}
            title="Toggle Map Types"
          >
            {showMapTypes ? '❯' : '❮'}
          </button>
        </div>
      </div>

      {/* ── Bottom Info Bar ── */}
      <div className="absolute bottom-3 left-3 right-3 z-30 max-w-xl mx-auto">
        {selectedFacility ? (
          /* Selected destination metrics */
          <div className="relative bg-white/97 border border-slate-200/90 rounded-2xl p-3 md:p-4 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">

            {/* Close Button for Preview */}
            {!isNavigating && (
              <button
                onClick={() => {
                  setSelectedFacility(null);
                  setSearchParams({});
                  setNavigationSteps([]);
                  setShowSteps(false);
                  setRouteError(null);
                  setIsNavigating(false);
                }}
                className="absolute top-2 right-2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer text-xs p-1"
                title={t('closePreview')}
              >
                ✕
              </button>
            )}

            <div className="flex items-center gap-2.5 pb-2 sm:pb-0 border-b border-slate-200/80 sm:border-none min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 bg-emerald-50 border border-emerald-200 text-emerald-600">
                🚶
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] uppercase font-bold tracking-widest text-slate-500 truncate">
                  {t('navigatingTo')}
                </p>
                <h4 className="text-xs md:text-sm font-black text-slate-900 leading-tight truncate">
                  {selectedFacility.name}
                </h4>
              </div>
            </div>

            <div className="hidden sm:block h-8 w-px bg-slate-200 shrink-0" />

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-4 shrink-0">
              {routeError ? (
                <div className="col-span-2 text-[10px] md:text-xs font-semibold text-rose-600 py-1 px-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-1.5">
                  <span>⚠️</span> {routeError}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-lg border border-slate-200/40 sm:border-none">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
                      ⏱️
                    </div>
                    <div>
                      <p className="text-[8px] uppercase font-bold tracking-wider text-slate-500">{t('walkTime')}</p>
                      <h4 className="text-xs md:text-sm font-black text-slate-900 whitespace-nowrap">{durationText || t('calculating')}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-lg border border-slate-200/40 sm:border-none">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                      🗺️
                    </div>
                    <div>
                      <p className="text-[8px] uppercase font-bold tracking-wider text-slate-500">{t('distance')}</p>
                      <h4 className="text-xs md:text-sm font-black text-slate-900 whitespace-nowrap">{distanceText || t('calculating')}</h4>
                    </div>
                  </div>

                  {/* Start Navigation Button */}
                  {!isNavigating && (
                    <button
                      onClick={() => setIsNavigating(true)}
                      className="col-span-2 sm:col-span-1 bg-white hover:bg-slate-100 text-slate-800 font-extrabold py-2 px-4 rounded-full border border-slate-300 shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 text-xs cursor-pointer shrink-0"
                    >
                      <svg className="w-4.5 h-4.5 text-blue-500 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <span>{t('start')}</span>
                    </button>
                  )}
                </>
              )}
            </div>

          </div>
        ) : showStatus && activeOrigin ? (
          /* Scanned QR location details card */
          <div className="bg-white/97 border border-slate-200/80 rounded-2xl p-3 shadow-xl backdrop-blur-md space-y-2.5 text-left relative transition-all duration-300">
            {/* You Are Here */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t('youAreHere')}
              </div>
            </div>

            {/* Title & Address */}
            <div className="space-y-0.5">
              <h4 className="text-xs md:text-sm font-black text-slate-900 leading-tight">
                {activeOrigin.name}
              </h4>
              <p className="text-[9px] text-slate-500 leading-none">{liveAddress}</p>
            </div>

            {/* Nearest Services */}
            {(nearestServices.Police || nearestServices.Medical || nearestServices.Toilet || nearestServices.Help) && (
              <div className="space-y-1.5 pt-0.5">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                  {t('nearbyFacilities')}
                </p>
                
                {/* Horizontal swipable badge list */}
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar whitespace-nowrap snap-x snap-mandatory">
                  {nearestServices.Police && (
                    <button
                      onClick={() => handleNavigateTo(nearestServices.Police)}
                      className="flex-shrink-0 snap-center rounded-xl py-1.5 px-2.5 bg-emerald-50 border border-emerald-200 flex items-center gap-1.5 cursor-pointer hover:bg-emerald-100 transition-all text-left"
                    >
                      <span className="text-xs">👮</span>
                      <div>
                        <p className="text-[7px] font-bold uppercase text-slate-500">Police</p>
                        <p className="text-[9px] text-emerald-700 font-extrabold leading-none">{nearestServices.Police.distanceFormatted}</p>
                      </div>
                    </button>
                  )}

                  {nearestServices.Medical && (
                    <button
                      onClick={() => handleNavigateTo(nearestServices.Medical)}
                      className="flex-shrink-0 snap-center rounded-xl py-1.5 px-2.5 bg-red-50 border border-red-200 flex items-center gap-1.5 cursor-pointer hover:bg-red-100 transition-all text-left"
                    >
                      <span className="text-xs">🏥</span>
                      <div>
                        <p className="text-[7px] font-bold uppercase text-slate-500">Hospital</p>
                        <p className="text-[9px] text-red-700 font-extrabold leading-none">{nearestServices.Medical.distanceFormatted}</p>
                      </div>
                    </button>
                  )}

                  {nearestServices.Toilet && (
                    <button
                      onClick={() => handleNavigateTo(nearestServices.Toilet)}
                      className="flex-shrink-0 snap-center rounded-xl py-1.5 px-2.5 bg-blue-50 border border-blue-200 flex items-center gap-1.5 cursor-pointer hover:bg-blue-100 transition-all text-left"
                    >
                      <span className="text-xs">🚻</span>
                      <div>
                        <p className="text-[7px] font-bold uppercase text-slate-500">Toilet</p>
                        <p className="text-[9px] text-blue-700 font-extrabold leading-none">{nearestServices.Toilet.distanceFormatted}</p>
                      </div>
                    </button>
                  )}

                  {nearestServices.Help && (
                    <button
                      onClick={() => handleNavigateTo(nearestServices.Help)}
                      className="flex-shrink-0 snap-center rounded-xl py-1.5 px-2.5 bg-cyan-50 border border-cyan-200 flex items-center gap-1.5 cursor-pointer hover:bg-cyan-100 transition-all text-left"
                    >
                      <span className="text-xs">💧</span>
                      <div>
                        <p className="text-[7px] font-bold uppercase text-slate-500">Water</p>
                        <p className="text-[9px] text-cyan-700 font-extrabold leading-none">{nearestServices.Help.distanceFormatted}</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* Footer Attribution inside card footer */}
            <div className="text-center pt-1 border-t border-slate-200/60">
              <span className="text-[9px] text-slate-400 font-semibold">
                Powered by{' '}
                <span className="font-black text-transparent bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 bg-clip-text ml-0.5">
                  Confluxaa
                </span>
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* SOS Modal Overlay */}
      {sosActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl bg-white p-5 border border-slate-100 relative">
            
            {/* Header: Title & Close Button */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-extrabold text-[#1e293b] tracking-tight font-sans">
                One Tap Call
              </h3>
              <button
                onClick={() => setSosActive(false)}
                className="w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* List Container */}
            <div className="space-y-0.5 max-h-[340px] overflow-y-auto no-scrollbar pr-0.5">
              
              {/* Police Control Room */}
              <a href="tel:100" className="flex justify-between items-center py-3 border-b border-[#f1f5f9] text-decoration-none group">
                <span className="text-xs font-bold text-[#1e293b] group-hover:text-red-500 transition-colors font-sans">
                  Police Control Room
                </span>
                <div className="w-8 h-8 rounded-full border border-[#fca5a5]/30 bg-white flex items-center justify-center shadow-sm group-hover:scale-105 active:scale-95 transition-all">
                  <span className="text-[#ef4444] text-xs">📞</span>
                </div>
              </a>

              {/* Ambulance Service */}
              <a href="tel:102" className="flex justify-between items-center py-3 border-b border-[#f1f5f9] text-decoration-none group">
                <span className="text-xs font-bold text-[#1e293b] group-hover:text-red-500 transition-colors font-sans">
                  Ambulance Service
                </span>
                <div className="w-8 h-8 rounded-full border border-[#fca5a5]/30 bg-white flex items-center justify-center shadow-sm group-hover:scale-105 active:scale-95 transition-all">
                  <span className="text-[#ef4444] text-xs">📞</span>
                </div>
              </a>

              {/* Fire Brigade */}
              <a href="tel:101" className="flex justify-between items-center py-3 border-b border-[#f1f5f9] text-decoration-none group">
                <span className="text-xs font-bold text-[#1e293b] group-hover:text-red-500 transition-colors font-sans">
                  Fire Brigade
                </span>
                <div className="w-8 h-8 rounded-full border border-[#fca5a5]/30 bg-white flex items-center justify-center shadow-sm group-hover:scale-105 active:scale-95 transition-all">
                  <span className="text-[#ef4444] text-xs">📞</span>
                </div>
              </a>

              {/* Women Helpline */}
              <a href="tel:1091" className="flex justify-between items-center py-3 border-b border-[#f1f5f9] text-decoration-none group">
                <span className="text-xs font-bold text-[#1e293b] group-hover:text-red-500 transition-colors font-sans">
                  Women Helpline
                </span>
                <div className="w-8 h-8 rounded-full border border-[#fca5a5]/30 bg-white flex items-center justify-center shadow-sm group-hover:scale-105 active:scale-95 transition-all">
                  <span className="text-[#ef4444] text-xs">📞</span>
                </div>
              </a>

              {/* Child Helpline */}
              <a href="tel:1098" className="flex justify-between items-center py-3 border-b border-[#f1f5f9] text-decoration-none group">
                <span className="text-xs font-bold text-[#1e293b] group-hover:text-red-500 transition-colors font-sans">
                  Child Helpline
                </span>
                <div className="w-8 h-8 rounded-full border border-[#fca5a5]/30 bg-white flex items-center justify-center shadow-sm group-hover:scale-105 active:scale-95 transition-all">
                  <span className="text-[#ef4444] text-xs">📞</span>
                </div>
              </a>

              {/* Disaster Management */}
              <a href="tel:1070" className="flex justify-between items-center py-3 border-b border-[#f1f5f9] text-decoration-none group">
                <span className="text-xs font-bold text-[#1e293b] group-hover:text-red-500 transition-colors font-sans">
                  Disaster Management
                </span>
                <div className="w-8 h-8 rounded-full border border-[#fca5a5]/30 bg-white flex items-center justify-center shadow-sm group-hover:scale-105 active:scale-95 transition-all">
                  <span className="text-[#ef4444] text-xs">📞</span>
                </div>
              </a>

              {/* Medical Emergency */}
              <a href="tel:112" className="flex justify-between items-center py-3 text-decoration-none group">
                <span className="text-xs font-bold text-[#1e293b] group-hover:text-red-500 transition-colors font-sans">
                  Medical Emergency
                </span>
                <div className="w-8 h-8 rounded-full border border-[#fca5a5]/30 bg-white flex items-center justify-center shadow-sm group-hover:scale-105 active:scale-95 transition-all">
                  <span className="text-[#ef4444] text-xs">📞</span>
                </div>
              </a>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
