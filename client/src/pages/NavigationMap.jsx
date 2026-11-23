import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import api from '../services/api';
import Loading from '../components/Loading';
import { useTranslation } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

const CANONICAL_CATEGORIES = [
  { name: 'Temple', emoji: '🛕', status: 'Active' },
  { name: 'Lost and Found', emoji: '🧳', status: 'Active' },
  { name: 'Drinking Water', emoji: '💧', status: 'Active' },
  { name: 'Restrooms', emoji: '🚻', status: 'Active' },
  { name: 'Medical', emoji: '🏥', status: 'Active' },
  { name: 'Help Desk', emoji: 'ℹ️', status: 'Active' },
  { name: 'Security', emoji: '🛡️', status: 'Active' },
  { name: 'Parking', emoji: '🅿️', status: 'Active' },
  { name: 'Food & Dining', emoji: '🍽️', status: 'Active' }
];

export const getFacilityEmoji = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('temple') || t.includes('monastery') || t.includes('mandir')) return '🛕';
  if (t.includes('water')) return '💧';
  if (t.includes('toilet') || t.includes('restroom')) return '🚻';
  if (t.includes('medical') || t.includes('hospital') || t.includes('clinic')) return '🏥';
  if (t.includes('help') || t.includes('info')) return 'ℹ️';
  if (t.includes('police') || t.includes('security') || t.includes('thana')) return '🛡️';
  if (t.includes('parking') || t.includes('park')) return '🅿️';
  if (t.includes('food') || t.includes('restaurant') || t.includes('dining')) return '🍽️';
  if (t.includes('lost')) return '🧳';
  return '📍';
};

// =========================================================================
// [PRESERVED]: Map Style Switcher options for Google Maps
// const MAP_TYPES = [
//   { key: 'roadmap', label: 'Standard Map', icon: '🗺️' },
//   { key: 'satellite', label: 'Satellite', icon: '🛰️' },
//   { key: 'hybrid', label: 'Hybrid', icon: '🌲' },
// ];
// =========================================================================

// =========================================================================
// [ACTIVE]: Map Style Switcher options for OpenStreetMap (OSM)
// =========================================================================
const MAP_TYPES = [
  { key: 'osm', label: 'Street Map', icon: '🗺️' },
  { key: 'satellite', label: 'Satellite', icon: '🛰️' },
  { key: 'topo', label: 'Topography', icon: '⛰️' },
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

// Canonical fallback center: Mahabodhi Temple Complex, Bodh Gaya
const DEFAULT_BODHGAYA_CENTER = {
  latitude: 24.6961,
  longitude: 84.9913,
  name: 'Bodh Gaya (Mahabodhi Temple Complex)',
};

export default function NavigationMap() {
  const { locationId } = useParams();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const destinationParam = searchParams.get('destination');

  // =========================================================================
  // [PRESERVED]: Google Maps State & Directions Refs
  // const [googleMapsKey, setGoogleMapsKey] = useState(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || null);
  // const directionsRendererRef = useRef(null);
  // const directionsServiceRef = useRef(null);
  // const lastRoutedCoordsRef = useRef(null);
  // const lastRouteTimeRef = useRef(0);
  // =========================================================================

  // [ACTIVE]: OpenStreetMap Provider configuration state
  const [_mapProvider, setMapProvider] = useState('osm');

  // Map DOM & Engine references (Works for both Leaflet/OSM & Google Maps)
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const userCircleRef = useRef(null);
  const routePolylineRef = useRef(null);
  const hasCenteredRef = useRef(false);
  const lastFetchedCoordsRef = useRef(null);

  // State
  const [categories, setCategories] = useState(CANONICAL_CATEGORIES);
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [routeError, setRouteError] = useState(null);

  // Geolocation & Map State
  const [gpsPosition, setGpsPosition] = useState(null);
  const [heading, setHeading] = useState(0);
  const prevGpsPositionRef = useRef(null);
  const categoryParam = searchParams.get('category');
  const queryParam = searchParams.get('q');

  // State
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || 'All');
  const [searchQuery, setSearchQuery] = useState(queryParam || '');
  const [mapType, setMapType] = useState('osm');
  const [showSteps, setShowSteps] = useState(false);
  const [navigationSteps, setNavigationSteps] = useState([]);
  const [distanceText, setDistanceText] = useState('');
  const [durationText, setDurationText] = useState('');
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [showStatus, setShowStatus] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showMapTypes, setShowMapTypes] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [liveAddress, setLiveAddress] = useState('Bodh Gaya, Bihar, India');
  const [gateLocation, setGateLocation] = useState(null);

  // Active Origin coordinate: GPS if available, else Gate location from URL, else Bodh Gaya Center fallback
  const activeOrigin = useMemo(() => {
    if (gpsPosition) {
      return {
        latitude: gpsPosition.latitude,
        longitude: gpsPosition.longitude,
        name: 'My Live GPS Location',
      };
    }
    if (gateLocation) {
      return {
        latitude: gateLocation.latitude,
        longitude: gateLocation.longitude,
        name: gateLocation.name || 'Gate Location',
      };
    }
    return DEFAULT_BODHGAYA_CENTER;
  }, [gpsPosition, gateLocation]);

  // Fetch gate location from backend if locationId URL param is present
  useEffect(() => {
    if (!locationId) return;
    const fetchGateLocation = async () => {
      try {
        const res = await api.get(`/location/${locationId}`);
        if (res && res.data) {
          setGateLocation(res.data);
          setError(null);
        }
      } catch (err) {
        console.warn('Could not load gate location from slug:', err);
      }
    };
    fetchGateLocation();
  }, [locationId]);

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

  // =========================================================================
  // [PRESERVED]: Fetch Google Maps API Key from backend
  // useEffect(() => {
  //   if (googleMapsKey) return;
  //   const fetchMapsKey = async () => {
  //     try {
  //       const res = await api.get('/config/maps-key');
  //       if (res.key) {
  //         setGoogleMapsKey(res.key);
  //       } else {
  //         setError('Google Maps API key is missing on the server.');
  //         setLoading(false);
  //       }
  //     } catch (err) {
  //       console.error('Failed to load Google Maps key:', err);
  //       setError('Failed to fetch Google Maps configuration from server.');
  //       setLoading(false);
  //     }
  //   };
  //   fetchMapsKey();
  // }, [googleMapsKey]);
  // =========================================================================

  // =========================================================================
  // [ACTIVE]: Fetch Map Engine Configuration (OpenStreetMap / DB-Primary)
  // =========================================================================
  useEffect(() => {
    const fetchMapConfig = async () => {
      try {
        const res = await api.get('/config/maps-key');
        if (res && res.provider === 'osm') {
          setMapProvider('osm');
          setScriptLoaded(true);
        } else if (res && res.key) {
          setGoogleMapsKey(res.key);
          setScriptLoaded(true);
        } else {
          // Fallback to OSM
          setMapProvider('osm');
          setScriptLoaded(true);
        }
      } catch (err) {
        console.warn('Map config load failed, defaulting to OpenStreetMap:', err);
        setMapProvider('osm');
        setScriptLoaded(true);
      }
    };
    fetchMapConfig();
  }, []);

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
        const activeCats = (res.data || []).filter((c) => c.status === 'Active');
        if (activeCats.length > 0) {
          setCategories(activeCats);
        }
      } catch (err) {
        console.warn('Using canonical fallback categories:', err.message || err);
      }
    };
    fetchCategories();
  }, []);

  // 3. Check Geolocation on Mount
  useEffect(() => {
    if (!navigator.geolocation) {
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
        setError(null);
      },
      (err) => {
        console.warn('GPS Notice (using Bodh Gaya Center fallback):', err);
        // Do not block the user with a fatal error screen; gracefully use Bodh Gaya Center
        setError(null);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [locationId]);

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

  // =========================================================================
  // [PRESERVED]: Load Google Maps script dynamically
  // useEffect(() => {
  //   if (!googleMapsKey) return;
  //   window.gm_authFailure = () => {
  //     console.error('[Google Maps Auth Error]: API key authentication failed.');
  //     setError('Google Maps failed to authenticate with the current API key.');
  //     setLoading(false);
  //   };
  //   if (window.google && window.google.maps && window.google.maps.Map) {
  //     setScriptLoaded(true);
  //     return;
  //   }
  //   const scriptId = 'google-maps-script';
  //   const existingScript = document.getElementById(scriptId);
  //   if (!existingScript) {
  //     window.initGoogleMaps = () => { setScriptLoaded(true); };
  //     const script = document.createElement('script');
  //     script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}&libraries=places&loading=async&callback=initGoogleMaps`;
  //     script.id = scriptId;
  //     script.async = true;
  //     script.defer = true;
  //     script.onerror = () => {
  //       setError('Failed to load Google Maps script. Check your API key.');
  //       setLoading(false);
  //     };
  //     document.body.appendChild(script);
  //   } else {
  //     const interval = setInterval(() => {
  //       if (window.google && window.google.maps && window.google.maps.Map) {
  //         setScriptLoaded(true);
  //         clearInterval(interval);
  //       }
  //     }, 100);
  //     return () => clearInterval(interval);
  //   }
  // }, [googleMapsKey]);
  // =========================================================================

  // =========================================================================
  // [PRESERVED]: Google Maps Reverse Geocode active GPS coordinates
  // useEffect(() => {
  //   if (!scriptLoaded || !activeOrigin) return;
  //   const lat = activeOrigin.latitude;
  //   const lng = activeOrigin.longitude;
  //   const geocoder = new window.google.maps.Geocoder();
  //   geocoder.geocode({ location: { lat, lng } }, (results, status) => {
  //     if (status === 'OK' && results[0]) {
  //       setLiveAddress(results[0].formatted_address);
  //     }
  //   });
  // }, [scriptLoaded, activeOrigin]);
  // =========================================================================

  // =========================================================================
  // [ACTIVE]: OpenStreetMap Reverse Geocode active GPS coordinates via Nominatim
  // =========================================================================
  useEffect(() => {
    if (!activeOrigin) return;
    const lat = activeOrigin.latitude;
    const lng = activeOrigin.longitude;

    const controller = new AbortController();
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
      headers: { 'User-Agent': 'BodhGaya-Navigation/1.0' },
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.display_name) {
          const parts = data.display_name.split(',');
          setLiveAddress(parts.slice(0, 3).join(', '));
        }
      })
      .catch(() => {
        setLiveAddress('Bodh Gaya, Bihar, India');
      });

    return () => controller.abort();
  }, [activeOrigin]);

  // 5. Fetch facilities near User's GPS or Scanned Location Slug
  useEffect(() => {
    const fetchFacilities = async () => {
      // Don't start loading until we have origin coordinates (GPS or Gate)
      if (!activeOrigin) {
        return;
      }

      // Check if coordinates, category, or search query changed to bypass cached fetch
      const hasCategoryChanged = lastFetchedCoordsRef.current?.category !== selectedCategory;
      const hasSearchChanged = lastFetchedCoordsRef.current?.searchQuery !== searchQuery;
      const isInitialFetch = !lastFetchedCoordsRef.current;

      let isFarEnough = false;
      if (lastFetchedCoordsRef.current) {
        const dLat = activeOrigin.latitude - lastFetchedCoordsRef.current.latitude;
        const dLng = activeOrigin.longitude - lastFetchedCoordsRef.current.longitude;
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
          lat: activeOrigin.latitude,
          lng: activeOrigin.longitude
        };

        const res = await api.get('/facilities/near', { params });
        setFacilities(res.facilities || []);

        lastFetchedCoordsRef.current = {
          latitude: activeOrigin.latitude,
          longitude: activeOrigin.longitude,
          category: selectedCategory,
          searchQuery: searchQuery
        };

        // Auto-select destination from query parameter if matches (exact, substring, or id)
        if (destinationParam && res.facilities) {
          const qDest = destinationParam.toLowerCase().trim();
          const match = res.facilities.find(
            (f) =>
              f.name.toLowerCase() === qDest ||
              f.id === destinationParam ||
              f.name.toLowerCase().includes(qDest) ||
              qDest.includes(f.name.toLowerCase())
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
  }, [activeOrigin, selectedCategory, searchQuery, destinationParam]);


  // =========================================================================
  // [PRESERVED]: Initialize Google Map Instance
  // useEffect(() => {
  //   if (!scriptLoaded || !mapRef.current || !activeOrigin) return;
  //   if (!mapInstanceRef.current) {
  //     mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
  //       center: { lat: activeOrigin.latitude, lng: activeOrigin.longitude },
  //       zoom: 17,
  //       disableDefaultUI: true,
  //       zoomControl: false,
  //       mapTypeControl: false,
  //       gestureHandling: 'greedy',
  //       styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'on' }] }],
  //     });
  //     directionsServiceRef.current = new window.google.maps.DirectionsService();
  //     directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
  //       map: mapInstanceRef.current,
  //       suppressMarkers: true,
  //       preserveViewport: true,
  //       polylineOptions: { strokeColor: '#10b981', strokeWeight: 6, strokeOpacity: 0.85 },
  //     });
  //     hasCenteredRef.current = true;
  //   } else if (!hasCenteredRef.current) {
  //     mapInstanceRef.current.setCenter({ lat: activeOrigin.latitude, lng: activeOrigin.longitude });
  //     hasCenteredRef.current = true;
  //   }
  // }, [scriptLoaded, activeOrigin]);
  //
  // useEffect(() => {
  //   if (mapInstanceRef.current) {
  //     mapInstanceRef.current.setMapTypeId(mapType);
  //   }
  // }, [mapType]);
  // =========================================================================

  // =========================================================================
  // [ACTIVE]: Initialize Leaflet / OpenStreetMap Instance (with resize observer)
  // =========================================================================
  useEffect(() => {
    if (!mapRef.current || !activeOrigin) return;

    if (!mapInstanceRef.current) {
      if (mapRef.current._leaflet_id) {
        delete mapRef.current._leaflet_id;
      }

      const map = L.map(mapRef.current, {
        center: [activeOrigin.latitude, activeOrigin.longitude],
        zoom: 17,
        zoomControl: false,
        attributionControl: false,
      });

      const initialTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      });
      initialTile.addTo(map);
      tileLayerRef.current = initialTile;

      mapInstanceRef.current = map;
      hasCenteredRef.current = true;
    } else if (!hasCenteredRef.current) {
      mapInstanceRef.current.setView([activeOrigin.latitude, activeOrigin.longitude], 17);
      hasCenteredRef.current = true;
    }

    // Invalidate size on window resize or device orientation change to prevent grey edge tiles
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [activeOrigin]);

  // Cleanup Leaflet map instance on component unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        hasCenteredRef.current = false;
      }
    };
  }, []);

  // [ACTIVE]: Update OpenStreetMap Tile Layer based on mapType
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let newTileLayer;
    if (mapType === 'satellite') {
      newTileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri',
      });
    } else if (mapType === 'topo') {
      newTileLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'Map data &copy; OpenTopoMap',
      });
    } else {
      newTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      });
    }

    newTileLayer.addTo(map);
    tileLayerRef.current = newTileLayer;
  }, [mapType]);

  // Compute nearest services dynamically from local facilities array
  const nearestServices = useMemo(() => {
    const getNearest = (matcher) => {
      const filtered = facilities.filter(f => matcher(f));
      if (filtered.length === 0) return null;
      return filtered[0]; // Facilities list is already sorted by proximity from backend
    };
    return {
      Police: getNearest(f => f.type === 'Police' || f.type === 'Security'),
      Medical: getNearest(f => f.type === 'Medical' || f.type === 'Hospital'),
      Toilet: getNearest(f => f.type === 'Toilet' || f.type === 'Restrooms'),
      Help: getNearest(f => f.type === 'Help Desk' || f.type === 'Help'),
      Water: getNearest(f => f.type === 'Drinking Water' || f.type === 'Water'),
      Temple: getNearest(f => f.type === 'Temple'),
      Parking: getNearest(f => f.type === 'Parking'),
      Food: getNearest(f => f.type === 'Food & Dining' || f.type === 'Food'),
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
      if ((q === 'lost' || q === 'found' || q.includes('lost')) && (name.includes('lost') || name.includes('found') || type.includes('lost') || desc.includes('lost'))) return true;
      if (q === 'police' && (name.includes('thana') || name.includes('outpost') || type === 'police')) return true;
      if (q === 'medical' && (name.includes('hospital') || name.includes('clinic') || type === 'medical')) return true;
      return false;
    });
  }, [facilities, searchQuery]);

  // =========================================================================
  // [PRESERVED]: Draw & Update Google Maps User Location Marker (Navigation Arrow)
  // useEffect(() => {
  //   if (!scriptLoaded || !mapInstanceRef.current || !activeOrigin) return;
  //   const map = mapInstanceRef.current;
  //   const position = { lat: activeOrigin.latitude, lng: activeOrigin.longitude };
  //   const arrowIcon = {
  //     path: 'M 0,-12 L 8,8 L 3,5 L -3,5 L -8,8 Z',
  //     fillColor: '#3b82f6',
  //     fillOpacity: 1,
  //     strokeColor: '#ffffff',
  //     strokeWeight: 2,
  //     scale: 1.6,
  //     rotation: heading || 0,
  //     anchor: new window.google.maps.Point(0, 0),
  //   };
  //   if (!userMarkerRef.current) {
  //     userMarkerRef.current = new window.google.maps.Marker({ position, map, title: t('youAreHere'), icon: arrowIcon });
  //   } else {
  //     userMarkerRef.current.setPosition(position);
  //     userMarkerRef.current.setIcon(arrowIcon);
  //   }
  //   const accuracyRadius = Math.min(gpsPosition?.accuracy || 15, 30);
  //   if (!userCircleRef.current) {
  //     userCircleRef.current = new window.google.maps.Circle({ map, center: position, radius: accuracyRadius, fillColor: '#3b82f6', fillOpacity: 0.15, strokeColor: '#3b82f6', strokeOpacity: 0.35, strokeWeight: 1.5, clickable: false });
  //   } else {
  //     userCircleRef.current.setCenter(position);
  //     userCircleRef.current.setRadius(accuracyRadius);
  //   }
  // }, [scriptLoaded, activeOrigin, heading, gpsPosition?.accuracy, t]);
  // =========================================================================

  // =========================================================================
  // [ACTIVE]: Leaflet / OpenStreetMap User Location Marker & Accuracy Halo
  // =========================================================================
  useEffect(() => {
    if (!mapInstanceRef.current || !activeOrigin) {
      if (userMarkerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      if (userCircleRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(userCircleRef.current);
        userCircleRef.current = null;
      }
      return;
    }

    const map = mapInstanceRef.current;
    const latlng = [activeOrigin.latitude, activeOrigin.longitude];

    const arrowSvg = `
      <div style="transform: rotate(${heading || 0}deg); transform-origin: center; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
        <svg viewBox="0 0 24 24" width="34" height="34" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
          <path d="M12 2 L20 20 L12 16 L4 20 Z" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
        </svg>
      </div>
    `;

    const userIcon = L.divIcon({
      html: arrowSvg,
      className: 'user-nav-heading-icon',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    if (!userMarkerRef.current) {
      const marker = L.marker(latlng, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 2px 4px; min-width: 100px; text-align: left;">
          <div style="font-size: 11px; font-weight: 850; color: #0f172a; display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
            <span style="font-size: 12px;">📍</span> ${t('youAreHere')}
          </div>
          <div style="font-size: 8px; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 2px 6px; border-radius: 5px; display: inline-flex; align-items: center; gap: 3px;">
            <span style="width: 4px; height: 4px; background: #3b82f6; border-radius: 50%;"></span>
            Accuracy: ±${Math.round(gpsPosition?.accuracy || 0)}m
          </div>
        </div>
      `);
      userMarkerRef.current = marker;
      marker.openPopup();
    } else {
      userMarkerRef.current.setLatLng(latlng);
      userMarkerRef.current.setIcon(userIcon);
    }

    const accuracyRadius = Math.min(gpsPosition?.accuracy || 15, 30);
    if (!userCircleRef.current) {
      userCircleRef.current = L.circle(latlng, {
        radius: accuracyRadius,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 1.5,
      }).addTo(map);
    } else {
      userCircleRef.current.setLatLng(latlng);
      userCircleRef.current.setRadius(accuracyRadius);
    }
  }, [activeOrigin, heading, gpsPosition?.accuracy, t]);

  // =========================================================================
  // [PRESERVED]: Draw Google Maps Facilities Markers
  // useEffect(() => {
  //   if (!scriptLoaded || !mapInstanceRef.current) return;
  //   markersRef.current.forEach((marker) => marker.setMap(null));
  //   markersRef.current = [];
  //   const map = mapInstanceRef.current;
  //   filteredFacilities.forEach((fac) => {
  //     const marker = new window.google.maps.Marker({
  //       position: { lat: fac.latitude, lng: fac.longitude },
  //       map,
  //       title: fac.name,
  //     });
  //     markersRef.current.push(marker);
  //   });
  // }, [scriptLoaded, filteredFacilities, selectedFacility]);
  // =========================================================================

  // Navigation click handler
  const handleNavigateTo = useCallback(async (facility) => {
    setSelectedFacility(facility);
    setIsNavigating(false);
    setSearchParams({ destination: facility.name });

    // Log telemetry click count to backend
    try {
      await api.post('/analytics/click', { category: facility.type });
    } catch (err) {
      console.warn('Failed to log click telemetry:', err);
    }
  }, [setSearchParams]);

  // =========================================================================
  // [ACTIVE]: Leaflet / OpenStreetMap Facilities Markers
  // =========================================================================
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Clear existing Leaflet markers
    markersRef.current.forEach((marker) => {
      if (marker && map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    });
    markersRef.current = [];

    filteredFacilities.forEach((fac) => {
      const typeLower = (fac.type || '').toLowerCase();
      const nameLower = (fac.name || '').toLowerCase();
      const descLower = (fac.description || '').toLowerCase();
      const combined = `${typeLower} ${nameLower} ${descLower}`;

      let emoji = null;
      const hasWord = (term) => new RegExp(`\\b${term}\\b`, 'i').test(combined);

      if (typeLower === 'police' || hasWord('police') || hasWord('thana') || hasWord('outpost') || hasWord('security')) {
        emoji = '🛡️';
      } else if (typeLower === 'medical' || typeLower === 'hospital' || hasWord('hospital') || hasWord('medical') || hasWord('clinic') || hasWord('doctor') || hasWord('pharmacy')) {
        emoji = '🏥';
      } else if (typeLower === 'toilet' || typeLower === 'restroom' || typeLower === 'restrooms' || hasWord('toilet') || hasWord('restroom') || hasWord('washroom')) {
        emoji = '🚻';
      } else if (typeLower === 'drinking water' || typeLower === 'water' || hasWord('water') || hasWord('drinking')) {
        emoji = '💧';
      } else if (typeLower === 'parking' || hasWord('parking')) {
        emoji = '🅿️';
      } else if (typeLower === 'temple' || hasWord('temple') || hasWord('mandir') || hasWord('ghat') || hasWord('worship')) {
        emoji = '🛕';
      } else if (typeLower === 'lost and found' || hasWord('lost') || hasWord('found') || hasWord('khoya') || hasWord('paya')) {
        emoji = '🧳';
      } else if (typeLower === 'help desk' || typeLower === 'help' || hasWord('help') || hasWord('information') || hasWord('inquiry')) {
        emoji = 'ℹ️';
      } else if (typeLower === 'food & dining' || typeLower === 'food' || hasWord('restaurant') || hasWord('food') || hasWord('dining') || hasWord('hotel') || hasWord('cafe') || hasWord('bhojanalaya')) {
        emoji = '🍽️';
      } else if (typeLower === 'transport' || hasWord('bus') || hasWord('railway') || hasWord('station')) {
        emoji = '🚌';
      } else {
        const catConfig = categories.find((c) => c.name.toLowerCase() === typeLower);
        emoji = catConfig?.emoji || '📍';
      }

      const isSelected = selectedFacility && (selectedFacility.id === fac.id || selectedFacility._id === fac.id);
      const color = isSelected ? '#059669' : '#10b981';

      const markerHtml = `
        <div style="
          width: ${isSelected ? '38px' : '32px'};
          height: ${isSelected ? '38px' : '32px'};
          background: #ffffff;
          border: 3px solid ${color};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isSelected ? '20px' : '16px'};
          box-shadow: 0 4px 10px rgba(0,0,0,0.25);
          cursor: pointer;
          transition: transform 0.2s;
        ">
          ${emoji}
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'facility-osm-marker',
        iconSize: [isSelected ? 38 : 32, isSelected ? 38 : 32],
        iconAnchor: [isSelected ? 19 : 16, isSelected ? 19 : 16],
      });

      const marker = L.marker([fac.latitude, fac.longitude], { icon: customIcon }).addTo(map);

      const displayCategory = fac.type && fac.type !== 'General' ? fac.type : 'Location';
      const popupHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px; min-width: 140px; color: #0f172a;">
          <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: ${color}; margin-bottom: 2px;">
            ${emoji} ${displayCategory}
          </div>
          <div style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">${fac.name}</div>
          <div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">
            ${t('distance') || 'Distance'}: ${fac.distanceFormatted || 'Nearby'}
          </div>
          ${
            isSelected
              ? `<span style="font-size:10px;font-weight:bold;color:#059669;">✓ ${t('navigatingTo') || 'Selected Destination'}</span>`
              : `<button id="osm-nav-${fac.id}" style="background-color:${color};color:#ffffff;border:none;padding:5px 10px;font-size:10px;font-weight:bold;border-radius:4px;cursor:pointer;width:100%;">${t('navigate') || 'Navigate Here'}</button>`
          }
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('popupopen', () => {
        const btn = document.getElementById(`osm-nav-${fac.id}`);
        if (btn) {
          btn.onclick = () => {
            handleNavigateTo(fac);
            marker.closePopup();
          };
        }
      });

      markersRef.current.push(marker);
    });

    // Auto-fit map bounds when viewing search results without active destination
    if (filteredFacilities.length > 0 && !selectedFacility && mapInstanceRef.current) {
      const bounds = L.latLngBounds();
      if (activeOrigin) {
        bounds.extend([activeOrigin.latitude, activeOrigin.longitude]);
      }
      filteredFacilities.forEach((fac) => {
        bounds.extend([fac.latitude, fac.longitude]);
      });
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
    }
  }, [filteredFacilities, selectedFacility, categories, activeOrigin, handleNavigateTo, t]);

  // =========================================================================
  // [PRESERVED]: Google Maps Directions Calculation
  // useEffect(() => {
  //   if (!scriptLoaded || !directionsRendererRef.current || !directionsServiceRef.current || !activeOrigin || !selectedFacility) return;
  //   directionsServiceRef.current.route({
  //     origin: { lat: activeOrigin.latitude, lng: activeOrigin.longitude },
  //     destination: { lat: selectedFacility.latitude, lng: selectedFacility.longitude },
  //     travelMode: window.google.maps.TravelMode.WALKING,
  //   }, (result, status) => {
  //     if (status === window.google.maps.DirectionsStatus.OK) {
  //       directionsRendererRef.current.setDirections(result);
  //     }
  //   });
  // }, [scriptLoaded, activeOrigin, selectedFacility]);
  // =========================================================================

  // =========================================================================
  // [ACTIVE]: OpenStreetMap / OSRM Walking Directions Route
  // =========================================================================
  useEffect(() => {
    if (!mapInstanceRef.current || !activeOrigin || !selectedFacility) {
      if (routePolylineRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }
      return;
    }

    const map = mapInstanceRef.current;
    const originLat = activeOrigin.latitude;
    const originLng = activeOrigin.longitude;
    const destLat = selectedFacility.latitude;
    const destLng = selectedFacility.longitude;

    const controller = new AbortController();
    const osrmUrl = `https://router.project-osrm.org/route/v1/walking/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;

    fetch(osrmUrl, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

          if (routePolylineRef.current && map.hasLayer(routePolylineRef.current)) {
            map.removeLayer(routePolylineRef.current);
          }

          routePolylineRef.current = L.polyline(coordinates, {
            color: '#10b981',
            weight: 6,
            opacity: 0.85,
            lineJoin: 'round',
          }).addTo(map);

          const distMeters = route.distance;
          const durSec = route.duration;
          setDistanceText(distMeters < 1000 ? `${Math.round(distMeters)} m` : `${(distMeters / 1000).toFixed(1)} km`);
          const mins = Math.max(1, Math.round(durSec / 60));
          setDurationText(`${mins} min${mins > 1 ? 's' : ''}`);

          if (route.legs && route.legs[0] && route.legs[0].steps) {
            const steps = route.legs[0].steps.map((st) => ({
              instructions: st.maneuver?.type === 'depart'
                ? (t('startWalking') || 'Start walking towards destination')
                : (st.name ? `${t('walkAlong') || 'Walk along'} ${st.name}` : (t('continuePathway') || 'Continue along pathway')),
              distance: { text: st.distance < 1000 ? `${Math.round(st.distance)} m` : `${(st.distance / 1000).toFixed(1)} km` },
              duration: { text: `${Math.round(st.duration / 60)} min` },
            }));
            setNavigationSteps(steps);
          }
          setRouteError(null);

          map.fitBounds(routePolylineRef.current.getBounds(), { padding: [60, 60] });
        } else {
          // Fallback to straight-line navigation if OSRM route is unavailable
          if (routePolylineRef.current && map.hasLayer(routePolylineRef.current)) {
            map.removeLayer(routePolylineRef.current);
          }
          routePolylineRef.current = L.polyline(
            [[originLat, originLng], [destLat, destLng]],
            { color: '#10b981', weight: 4, dashArray: '6, 8', opacity: 0.85 }
          ).addTo(map);

          const distanceMeters = getHaversineDistance(originLat, originLng, destLat, destLng);
          setDistanceText(distanceMeters < 1000 ? `${Math.round(distanceMeters)} m` : `${(distanceMeters / 1000).toFixed(1)} km`);
          const mins = Math.max(1, Math.round(distanceMeters / 80));
          setDurationText(`${mins} min${mins > 1 ? 's' : ''}`);
        }
      })
      .catch(() => {
        // Safe fallback polyline on network error or offline mode
        if (routePolylineRef.current && map.hasLayer(routePolylineRef.current)) {
          map.removeLayer(routePolylineRef.current);
        }
        routePolylineRef.current = L.polyline(
          [[originLat, originLng], [destLat, destLng]],
          { color: '#10b981', weight: 4, dashArray: '6, 8', opacity: 0.85 }
        ).addTo(map);

        const distanceMeters = getHaversineDistance(originLat, originLng, destLat, destLng);
        setDistanceText(distanceMeters < 1000 ? `${Math.round(distanceMeters)} m` : `${(distanceMeters / 1000).toFixed(1)} km`);
        const mins = Math.max(1, Math.round(distanceMeters / 80));
        setDurationText(`${mins} min${mins > 1 ? 's' : ''}`);
      });

    return () => controller.abort();
  }, [activeOrigin, selectedFacility, t]);

  // Recenter map to origin and force fetch facilities around current coordinates
  const handleRecenter = () => {
    if (mapInstanceRef.current && activeOrigin) {
      const map = mapInstanceRef.current;
      const zoom = 17;
      const latOffset = selectedFacility ? 0.08 / Math.pow(2, zoom - 10) : 0;
      const targetLat = activeOrigin.latitude - latOffset;
      const targetLng = activeOrigin.longitude;

      if (typeof map.setView === 'function') {
        // Leaflet / OpenStreetMap
        map.setView([targetLat, targetLng], zoom);
      } else if (typeof map.setCenter === 'function') {
        // Google Maps
        map.setZoom(zoom);
        map.setCenter({ lat: targetLat, lng: targetLng });
      }

      // Clear cache to force a fresh fetch call in useEffect
      lastFetchedCoordsRef.current = null;
      setGpsPosition((prev) => (prev ? { ...prev } : null));
    }
  };

  // =========================================================================
  // [PRESERVED]: Google Maps Missing API Key warning UI
  // if (!googleMapsKey && !loading && mapProvider === 'google') {
  //   return (
  //     <div className="max-w-md mx-auto my-12 bg-white border border-amber-300/40 rounded-2xl p-8 text-center shadow-xl">
  //       <h2 className="text-xl font-bold text-slate-900 mb-2">Google Maps API Key Missing</h2>
  //       <p className="text-slate-600 text-sm mb-6">
  //         To run this dynamic real-time map, configure <code className="bg-slate-100 px-1 py-0.5 rounded text-amber-600">VITE_GOOGLE_MAPS_API_KEY</code> in your client's environment variables.
  //       </p>
  //     </div>
  //   );
  // }
  // =========================================================================

  /* ── Error ── */
  if (error && !activeOrigin) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50/60 p-4">
        <div className="max-w-md w-full bg-white border border-slate-100 rounded-[28px] p-6 sm:p-8 text-center shadow-2xl animate-fade-in relative overflow-hidden">
          
          {/* Header Accent Decorator */}
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-4 shadow-sm text-2xl">
            📍
          </div>

          <h2 className="text-xl font-black text-slate-900 mb-2 tracking-tight">
            Location Permission Needed
          </h2>

          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-5">
            To provide live navigation, calculate walking distances, and show nearby services on the map, Bodh Gaya Guide requires access to your device's location (GPS).
          </p>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left mb-6 space-y-2">
            <p className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
              How to enable permission:
            </p>
            <ol className="text-xs text-slate-700 space-y-1.5 list-decimal list-inside font-medium">
              <li>Click the <strong>lock/tune icon</strong> 🔒 or <strong>"Not allowed"</strong> prompt next to the address bar.</li>
              <li>Toggle <strong>Location</strong> permission to <strong>"Allow"</strong>.</li>
              <li>Refresh this page or click retry below.</li>
            </ol>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs tracking-wide shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>🔄</span> Try Reloading Map
          </button>
        </div>
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
            
            {/* Top Bar with Back Button, Search Input & Language Selector */}
            <div className="flex items-center gap-2 w-full">
              {/* Back to Home / Welcome Page Button */}
              <Link
                to="/"
                className="w-9 h-9 rounded-2xl border border-slate-800 bg-slate-900/95 hover:bg-slate-850 text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer shrink-0"
                title="Back to Home Page"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              </Link>

              {/* Search Input */}
              <div className="flex items-center gap-1.5 rounded-2xl border border-slate-800 px-3 py-1.5 shadow-lg bg-slate-900/95 backdrop-blur-md flex-1">
                <input
                  id="search-input"
                  name="search"
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-white text-xs font-medium placeholder-slate-400 focus:outline-none w-full"
                />
                {searchQuery ? (
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setSearchParams({});
                    }} 
                    className="w-5 h-5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all text-[11px] font-bold flex items-center justify-center cursor-pointer shrink-0"
                    title="Clear search"
                  >
                    ✕
                  </button>
                ) : (
                  <span className="text-slate-400 text-xs">🔍</span>
                )}
              </div>

              {/* Language Selector */}
              <div className="shrink-0">
                <LanguageSelector />
              </div>
            </div>

            {/* Dynamic Category Filter Pills */}
            <div className="flex items-center gap-1.5 no-scrollbar overflow-x-auto w-full max-w-[90vw] sm:max-w-md py-0.5">
              <button
                onClick={() => { setSelectedCategory('All'); setSearchQuery(''); setSearchParams({}); }}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap cursor-pointer border transition-all active:scale-95 ${ (selectedCategory === 'All' && !searchQuery)
                    ? 'bg-emerald-500 text-white border-emerald-400 font-extrabold shadow-lg shadow-emerald-500/20'
                    : 'border-slate-800 text-slate-200 hover:text-white bg-slate-900/95 backdrop-blur-md'
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
                        : 'border-slate-800 text-slate-200 hover:text-white bg-slate-900/95 backdrop-blur-md'
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
                <span>{t('noPlacesFound') || 'No places found for'} "{searchQuery}"</span>
              </div>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchParams({});
                }}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-extrabold cursor-pointer transition-all active:scale-95 shrink-0"
              >
                {t('close') || 'Clear Search'}
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

      {/* ── [PRESERVED]: Google Map Container / [ACTIVE]: OpenStreetMap Leaflet Container ── */}
      <div ref={mapRef} className="flex-1 w-full h-full relative z-10" />

      {/* ── Floating Map Control Stack (Bottom Right) ── */}
      <div className={`absolute ${(selectedFacility || (showStatus && activeOrigin)) ? 'bottom-[180px]' : 'bottom-4'} right-3 z-30 flex flex-col gap-1.5 transition-all duration-300 items-end`}>
        {/* Recenter / Re-locate GPS Floating Button (Positioned Above SOS) */}
        <button
          onClick={handleRecenter}
          className="w-11 h-11 rounded-xl text-base flex items-center justify-center shadow-lg bg-slate-900/95 border border-slate-800 text-blue-400 hover:text-blue-300 backdrop-blur-md cursor-pointer transition-all active:scale-95 hover:bg-slate-850 hover:shadow-xl group relative"
          title={t('recenterMap') || "Re-center to my location"}
          aria-label="Re-center to my location"
        >
          {/* Precise Location Crosshair SVG */}
          <svg className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <circle cx="12" cy="12" r="3" className="fill-blue-400" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
          </svg>
        </button>

        {/* Floating SOS Button */}
        <button
          onClick={() => setSosActive(true)}
          className="h-9 px-3 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md bg-red-500 hover:bg-red-600 text-white backdrop-blur-md cursor-pointer transition-all active:scale-95 shadow-red-500/30"
          title="Emergency SOS"
        >
          <span className="text-sm">🚨</span>
          <span className="text-xs font-extrabold tracking-wider">SOS</span>
        </button>

        {/* Map Type Expansion Wrapper */}
        <div className="flex items-center gap-1.5">
          {/* Expanded Map Types Menu (Slides out to the left) */}
          {showMapTypes && (
            <div className="flex gap-1 bg-slate-900/95 border border-slate-800 p-1 rounded-lg shadow-lg backdrop-blur-md animate-fade-in mr-0.5">
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
                        : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-750'
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
                : 'bg-slate-900/95 text-slate-200 border-slate-800 hover:bg-slate-850'
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
          <div className="relative bg-slate-900/95 border border-slate-800 rounded-2xl p-3 md:p-4 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 text-white">

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
                className="absolute top-2 right-2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-xs p-1"
                title={t('closePreview')}
              >
                ✕
              </button>
            )}

            <div className="flex items-center gap-2.5 pb-2 sm:pb-0 border-b border-slate-800 sm:border-none min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 bg-slate-800 border border-slate-700 text-emerald-400">
                🚶
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400 truncate">
                  {t('navigatingTo')}
                </p>
                <h4 className="text-xs md:text-sm font-black text-white leading-tight truncate">
                  {selectedFacility.name}
                </h4>
              </div>
            </div>

            <div className="hidden sm:block h-8 w-px bg-slate-800 shrink-0" />

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-4 shrink-0">
              {routeError ? (
                <div className="col-span-2 text-[10px] md:text-xs font-semibold text-rose-400 py-1 px-2.5 bg-rose-950/30 border border-rose-900 rounded-xl flex items-center gap-1.5">
                  <span>⚠️</span> {routeError}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 bg-slate-800/40 sm:bg-transparent p-2 sm:p-0 rounded-lg border border-slate-850 sm:border-none">
                    <div className="w-8 h-8 rounded-lg bg-indigo-950/65 border border-indigo-900 text-indigo-400 flex items-center justify-center shrink-0">
                      ⏱️
                    </div>
                    <div>
                      <p className="text-[8px] uppercase font-bold tracking-wider text-slate-400">{t('walkTime')}</p>
                      <h4 className="text-xs md:text-sm font-black text-white whitespace-nowrap">{durationText || t('calculating')}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-800/40 sm:bg-transparent p-2 sm:p-0 rounded-lg border border-slate-850 sm:border-none">
                    <div className="w-8 h-8 rounded-lg bg-emerald-950/65 border border-emerald-900 text-emerald-400 flex items-center justify-center shrink-0">
                      🗺️
                    </div>
                    <div>
                      <p className="text-[8px] uppercase font-bold tracking-wider text-slate-400">{t('distance')}</p>
                      <h4 className="text-xs md:text-sm font-black text-white whitespace-nowrap">{distanceText || t('calculating')}</h4>
                    </div>
                  </div>

                  {/* Start Navigation Button */}
                  {!isNavigating && (
                    <button
                      onClick={() => {
                        setIsNavigating(true);
                        // Focus once on starting position when Start is tapped (Leaflet & Google Maps safe)
                        if (mapInstanceRef.current && activeOrigin) {
                          const latOffset = 0.08 / Math.pow(2, 19 - 10);
                          const targetLat = activeOrigin.latitude - latOffset;
                          const targetLng = activeOrigin.longitude;
                          if (typeof mapInstanceRef.current.setView === 'function') {
                            mapInstanceRef.current.setView([targetLat, targetLng], 19);
                          } else if (typeof mapInstanceRef.current.setCenter === 'function') {
                            mapInstanceRef.current.setZoom(19);
                            mapInstanceRef.current.setCenter({ lat: targetLat, lng: targetLng });
                          }
                        }
                      }}
                      className="col-span-2 sm:col-span-1 bg-slate-800 hover:bg-slate-750 text-white font-extrabold py-2 px-4 rounded-full border border-slate-750 shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 text-xs cursor-pointer shrink-0"
                    >
                      <svg className="w-4.5 h-4.5 text-blue-400 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24">
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
          <div className="space-y-2">
            {/* ── Category / Nearby Places Carousel ── */}
            {filteredFacilities.length > 0 && (
              <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3 shadow-xl backdrop-blur-md space-y-2 text-left animate-fade-in text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>
                      {selectedCategory && selectedCategory !== 'All'
                        ? `${t('nearbyPlacesInCategory') || 'Nearby Places in'} ${t(selectedCategory) || selectedCategory}`
                        : (t('nearbyPlaces') || 'Nearby Places')
                      }
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700 font-mono">
                    {filteredFacilities.length} {t('facilities') || 'Places'}
                  </span>
                </div>

                {/* Horizontal Place Cards */}
                <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar whitespace-nowrap snap-x snap-mandatory">
                  {filteredFacilities.slice(0, 15).map((fac) => (
                    <div
                      key={fac.id || fac._id}
                      onClick={() => handleNavigateTo(fac)}
                      className="flex-shrink-0 snap-center w-56 sm:w-64 p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/60 transition-all cursor-pointer group active:scale-98 flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg p-1.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                          {getFacilityEmoji(fac.type)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-black text-white group-hover:text-amber-300 transition-colors truncate leading-snug">
                            {fac.name}
                          </h5>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {fac.description || fac.address || t(fac.type) || fac.type}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-850">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400">
                          <span>📍 {fac.distanceFormatted}</span>
                          <span className="text-slate-600">•</span>
                          <span>⏱️ {fac.walkingTimeFormatted}</span>
                        </div>
                        <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 group-hover:bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                          {t('navigate') || 'Go'} ➔
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scanned QR location details card */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3 shadow-xl backdrop-blur-md space-y-2.5 text-left relative transition-all duration-300 text-white">
              {/* You Are Here */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {t('youAreHere')}
                </div>
              </div>

              {/* Title & Address */}
              <div className="space-y-0.5">
                <h4 className="text-xs md:text-sm font-black text-white leading-tight">
                  {activeOrigin.name}
                </h4>
                <p className="text-[9px] text-slate-400 leading-none">{liveAddress}</p>
              </div>

              {/* Nearest Services Quick Access */}
              {(nearestServices.Police || nearestServices.Medical || nearestServices.Toilet || nearestServices.Water || nearestServices.Temple || nearestServices.Parking) && (
                <div className="space-y-1.5 pt-0.5">
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                    {t('nearbyFacilities')}
                  </p>
                  
                  {/* Horizontal swipable badge list */}
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar whitespace-nowrap snap-x snap-mandatory">
                    {nearestServices.Police && (
                      <button
                        onClick={() => handleNavigateTo(nearestServices.Police)}
                        className="flex-shrink-0 snap-center rounded-xl py-1.5 px-2.5 bg-emerald-950/40 border border-emerald-900 flex items-center gap-1.5 cursor-pointer hover:bg-emerald-900/30 transition-all text-left"
                      >
                        <span className="text-xs">👮</span>
                        <div>
                          <p className="text-[7px] font-bold uppercase text-slate-400">{t('police') || 'Police'}</p>
                          <p className="text-[9px] text-emerald-400 font-extrabold leading-none">{nearestServices.Police.distanceFormatted}</p>
                        </div>
                      </button>
                    )}

                    {nearestServices.Medical && (
                      <button
                        onClick={() => handleNavigateTo(nearestServices.Medical)}
                        className="flex-shrink-0 snap-center rounded-xl py-1.5 px-2.5 bg-red-950/40 border border-red-900 flex items-center gap-1.5 cursor-pointer hover:bg-red-900/30 transition-all text-left"
                      >
                        <span className="text-xs">🏥</span>
                        <div>
                          <p className="text-[7px] font-bold uppercase text-slate-400">{t('Medical') || 'Medical'}</p>
                          <p className="text-[9px] text-red-400 font-extrabold leading-none">{nearestServices.Medical.distanceFormatted}</p>
                        </div>
                      </button>
                    )}

                    {nearestServices.Toilet && (
                      <button
                        onClick={() => handleNavigateTo(nearestServices.Toilet)}
                        className="flex-shrink-0 snap-center rounded-xl py-1.5 px-2.5 bg-blue-950/40 border border-blue-900 flex items-center gap-1.5 cursor-pointer hover:bg-blue-900/30 transition-all text-left"
                      >
                        <span className="text-xs">🚻</span>
                        <div>
                          <p className="text-[7px] font-bold uppercase text-slate-400">{t('Restrooms') || 'Toilet'}</p>
                          <p className="text-[9px] text-blue-400 font-extrabold leading-none">{nearestServices.Toilet.distanceFormatted}</p>
                        </div>
                      </button>
                    )}

                    {nearestServices.Water && (
                      <button
                        onClick={() => handleNavigateTo(nearestServices.Water)}
                        className="flex-shrink-0 snap-center rounded-xl py-1.5 px-2.5 bg-cyan-950/40 border border-cyan-900 flex items-center gap-1.5 cursor-pointer hover:bg-cyan-900/30 transition-all text-left"
                      >
                        <span className="text-xs">💧</span>
                        <div>
                          <p className="text-[7px] font-bold uppercase text-slate-400">{t('Drinking Water') || 'Water'}</p>
                          <p className="text-[9px] text-cyan-400 font-extrabold leading-none">{nearestServices.Water.distanceFormatted}</p>
                        </div>
                      </button>
                    )}

                    {nearestServices.Temple && (
                      <button
                        onClick={() => handleNavigateTo(nearestServices.Temple)}
                        className="flex-shrink-0 snap-center rounded-xl py-1.5 px-2.5 bg-amber-950/40 border border-amber-900 flex items-center gap-1.5 cursor-pointer hover:bg-amber-900/30 transition-all text-left"
                      >
                        <span className="text-xs">🛕</span>
                        <div>
                          <p className="text-[7px] font-bold uppercase text-slate-400">{t('Temple') || 'Temple'}</p>
                          <p className="text-[9px] text-amber-400 font-extrabold leading-none">{nearestServices.Temple.distanceFormatted}</p>
                        </div>
                      </button>
                    )}

                    {nearestServices.Parking && (
                      <button
                        onClick={() => handleNavigateTo(nearestServices.Parking)}
                        className="flex-shrink-0 snap-center rounded-xl py-1.5 px-2.5 bg-teal-950/40 border border-teal-900 flex items-center gap-1.5 cursor-pointer hover:bg-teal-900/30 transition-all text-left"
                      >
                        <span className="text-xs">🅿️</span>
                        <div>
                          <p className="text-[7px] font-bold uppercase text-slate-400">{t('Parking') || 'Parking'}</p>
                          <p className="text-[9px] text-teal-400 font-extrabold leading-none">{nearestServices.Parking.distanceFormatted}</p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Footer Attribution inside card footer */}
              <div className="text-center pt-1 border-t border-slate-800">
                <span className="text-[9px] text-slate-500 font-semibold">
                  Powered by{' '}
                  <a
                    href="https://yugantasolutions.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-black text-transparent bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 bg-clip-text hover:opacity-85 transition-opacity ml-0.5 cursor-pointer"
                  >
                    Yuganta Solutions
                  </a>
                </span>
              </div>
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
