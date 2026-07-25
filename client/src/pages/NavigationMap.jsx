import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import Loading from '../components/Loading';

// Map Style Switcher options for Google Maps
const MAP_TYPES = [
  { key: 'roadmap', label: 'Standard Map', icon: '🗺️' },
  { key: 'satellite', label: 'Satellite', icon: '🛰️' },
  { key: 'hybrid', label: 'Hybrid', icon: '🌲' },
];

export default function NavigationMap() {
  const { locationId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const destinationParam = searchParams.get('destination');

  // API Key state
  const [googleMapsKey, setGoogleMapsKey] = useState(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || null);

  // Refs for Google Map instances
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const hasCenteredRef = useRef(false);
  const lastFetchedCoordsRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const directionsServiceRef = useRef(null);

  // State
  const [categories, setCategories] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Geolocation & Map State
  const [gpsPosition, setGpsPosition] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [heading, setHeading] = useState(0);
  const prevGpsPositionRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapType, setMapType] = useState('roadmap');
  const [showSteps, setShowSteps] = useState(false);
  const [navigationSteps, setNavigationSteps] = useState([]);
  const [distanceText, setDistanceText] = useState('');
  const [durationText, setDurationText] = useState('');

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

  // 3. Check Geolocation on Mount with Fallback
  useEffect(() => {
    let gpsTimeout = null;

    // Default Fallback coordinates (Delhi center)
    const setFallbackLocation = () => {
      setGpsPosition((current) => {
        if (current) return current; // Keep actual GPS if already set
        console.log('Using fallback coordinates');
        return {
          latitude: 28.6139,
          longitude: 77.2090,
          accuracy: 100,
        };
      });
      setGpsError('Using default location (GPS blocked or timed out).');
    };

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      setFallbackLocation();
      return;
    }

    // Set a 5-second timeout to fall back if user ignores the permission prompt
    gpsTimeout = setTimeout(() => {
      setFallbackLocation();
    }, 5000);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (gpsTimeout) clearTimeout(gpsTimeout);
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
      },
      (err) => {
        if (gpsTimeout) clearTimeout(gpsTimeout);
        console.warn('GPS Error:', err);
        setFallbackLocation();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (gpsTimeout) clearTimeout(gpsTimeout);
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
  const [scriptLoaded, setScriptLoaded] = useState(false);
  useEffect(() => {
    if (!googleMapsKey) {
      return;
    }

    if (window.google && window.google.maps) {
      setScriptLoaded(true);
      return;
    }

    const scriptId = 'google-maps-script';
    const existingScript = document.getElementById(scriptId);

    if (!existingScript) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}&libraries=places`;
      script.id = scriptId;
      script.async = true;
      script.defer = true;
      script.onload = () => setScriptLoaded(true);
      script.onerror = () => {
        setError('Failed to load Google Maps script. Check your API key.');
        setLoading(false);
      };
      document.body.appendChild(script);
    } else {
      existingScript.addEventListener('load', () => setScriptLoaded(true));
    }
  }, [googleMapsKey]);

  // 5. Fetch facilities near User's GPS or Scanned Location Slug
  useEffect(() => {
    const fetchFacilities = async () => {
      // Don't start loading until we have GPS coordinates
      if (!gpsPosition) {
        return;
      }

      // Check if coordinates have changed significantly, or if category changed, to avoid redundant fetches.
      const hasCategoryChanged = lastFetchedCoordsRef.current?.category !== selectedCategory;
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

      if (!isInitialFetch && !hasCategoryChanged && !isFarEnough) {
        return;
      }

      try {
        const params = { 
          category: selectedCategory,
          lat: gpsPosition.latitude,
          lng: gpsPosition.longitude
        };

        const res = await api.get('/facilities/near', { params });
        setFacilities(res.facilities || []);

        lastFetchedCoordsRef.current = {
          latitude: gpsPosition.latitude,
          longitude: gpsPosition.longitude,
          category: selectedCategory
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
  }, [gpsPosition, selectedCategory, destinationParam]);

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

  // Filter facilities by search query locally
  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [facilities, searchQuery]);

  // 8a. Draw & Update User Location Marker (Navigation Arrow)
  useEffect(() => {
    if (!scriptLoaded || !mapInstanceRef.current || !activeOrigin) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
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
      scale: 1.4,
      rotation: heading || 0,
      anchor: new window.google.maps.Point(0, 0),
    };

    if (!userMarkerRef.current) {
      userMarkerRef.current = new window.google.maps.Marker({
        position,
        map,
        title: activeOrigin.name,
        icon: arrowIcon,
      });

      const userInfoWindow = new window.google.maps.InfoWindow({
        content: `<div style="color:#0f172a;font-family:sans-serif;font-size:12px;padding:4px;">
          <strong>📍 ${activeOrigin.name}</strong>
          <p style="margin:2px 0 0 0;font-size:10px;color:#3b82f6;">Live GPS accuracy: ~${Math.round(gpsPosition?.accuracy || 0)}m</p>
        </div>`,
      });

      userMarkerRef.current.addListener('click', () => {
        userInfoWindow.open(map, userMarkerRef.current);
      });
    } else {
      userMarkerRef.current.setPosition(position);
      userMarkerRef.current.setIcon(arrowIcon);
    }

    // Auto-Follow Mode: Center the map on the user if they are actively navigating
    if (selectedFacility) {
      map.setCenter(position);
    }
  }, [scriptLoaded, activeOrigin, heading, gpsPosition?.accuracy, selectedFacility]);

  // 8b. Draw Facilities Markers
  useEffect(() => {
    if (!scriptLoaded || !mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const map = mapInstanceRef.current;

    filteredFacilities.forEach((fac) => {
      // Find emoji/color config from category records
      const catConfig = categories.find(c => c.name === fac.type);
      const color = '#10b981';
      const emoji = catConfig?.emoji || '📍';
      const isSelected = selectedFacility && selectedFacility.id === fac.id;

      const marker = new window.google.maps.Marker({
        position: { lat: fac.latitude, lng: fac.longitude },
        map,
        title: fac.name,
        label: {
          text: emoji,
          fontSize: isSelected ? '15px' : '12px',
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 18 : 14,
          fillColor: '#ffffff',
          fillOpacity: 0.95,
          strokeColor: color,
          strokeWeight: 2,
        },
      });

      const infoContent = `
        <div style="font-family: sans-serif; padding: 6px; min-width: 140px; color: #0f172a;">
          <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: ${color}; margin-bottom: 2px;">
            ${emoji} ${fac.type} (Google Map Listing)
          </div>
          <div style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">${fac.name}</div>
          <div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">
            Distance: ${fac.distanceFormatted}
          </div>
          ${
            isSelected
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

  // 9. Calculate Walking Directions
  useEffect(() => {
    if (!scriptLoaded || !directionsRendererRef.current || !directionsServiceRef.current || !activeOrigin || !selectedFacility) {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections({ routes: [] });
      }
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
        } else {
          console.error('Directions request failed:', status);
        }
      }
    );
  }, [scriptLoaded, activeOrigin, selectedFacility]);

  // Navigation click handler
  const handleNavigateTo = async (facility) => {
    setSelectedFacility(facility);
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
      mapInstanceRef.current.setCenter({ lat: activeOrigin.latitude, lng: activeOrigin.longitude });
      mapInstanceRef.current.setZoom(17);
      
      // Clear cache to force a fresh fetch call in useEffect
      lastFetchedCoordsRef.current = null;
      setGpsPosition({ ...gpsPosition });
    }
  };

  // Missing API Key warning UI
  if (!googleMapsKey) {
    return (
      <div className="max-w-md mx-auto my-12 bg-slate-900 border border-amber-500/20 rounded-2xl p-8 text-center shadow-xl">
        <h2 className="text-xl font-bold text-white mb-2">Google Maps API Key Missing</h2>
        <p className="text-slate-400 text-sm mb-6">
          To run this dynamic real-time map, configure <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-400">VITE_GOOGLE_MAPS_API_KEY</code> in your client's environment variables.
        </p>
      </div>
    );
  }

  /* ── Error ── */
  if (error && !activeOrigin) {
    return (
      <div className="max-w-md mx-auto my-12 bg-slate-900 border border-red-500/20 rounded-2xl p-8 text-center shadow-xl">
        <h2 className="text-xl font-bold text-white mb-2">Map Error</h2>
        <p className="text-slate-400 text-sm mb-6">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative h-[88vh] md:h-[90vh] min-h-[550px] w-full rounded-2xl overflow-hidden flex flex-col animate-fade-in" style={{ boxShadow: '0 0 0 1px rgba(30,41,59,0.6), 0 30px 80px rgba(0,0,0,0.6)' }}>
      
      {/* ── Loading Overlay ── */}
      {(loading || !scriptLoaded) && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
          <Loading message="Fetching live GPS location & nearby Map..." />
        </div>
      )}

      {/* ── Top Turn-by-Turn Header (When Navigating) ── */}
      {selectedFacility && (
        <div className="absolute top-0 left-0 right-0 z-40 text-white px-4 py-3 shadow-2xl backdrop-blur-xl flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', borderBottom: '1px solid rgba(52,211,153,0.3)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/12 border border-white/15 flex items-center justify-center text-xl shrink-0">
              🚶
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-black tracking-widest text-emerald-100/80 flex items-center gap-1.5">
                <span>Navigation Mode</span>
                <span className="opacity-40">·</span>
                <span>{durationText} walk</span>
              </p>
              <h3 className="text-sm font-black text-white truncate leading-tight">
                Walking Route to {selectedFacility.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="py-1.5 px-3 rounded-xl bg-slate-950/40 hover:bg-slate-950/60 text-white font-bold text-xs shadow transition-all border border-white/20 cursor-pointer flex items-center gap-1"
            >
              <span>📋</span>
              <span className="hidden sm:inline">Steps</span>
            </button>
            <button
              onClick={() => {
                setSelectedFacility(null);
                setSearchParams({});
                setNavigationSteps([]);
                setShowSteps(false);
              }}
              className="w-8 h-8 rounded-xl bg-slate-950/40 hover:bg-slate-950/70 text-white font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
              title="Exit Navigation"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Top Controls Panel (Unified and fully responsive) ── */}
      <div className={`absolute ${selectedFacility ? 'top-16' : 'top-3'} inset-x-3 z-30 flex flex-col md:flex-row md:items-center justify-between gap-3 pointer-events-none`}>
        
        {/* Recenter Button */}
        <div className="flex items-center gap-2 pointer-events-auto self-start">
          <button
            onClick={handleRecenter}
            className="inline-flex items-center gap-1.5 py-2 px-3 md:py-2.5 md:px-4 rounded-2xl font-bold text-xs border cursor-pointer active:scale-95 bg-slate-950/90 text-emerald-400 border-slate-800/80 shadow-xl backdrop-blur-md"
          >
            🎯 Recenter
          </button>
        </div>

        {/* Search & Categories (Overview mode only) */}
        {!selectedFacility && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pointer-events-auto w-full md:w-auto">
            {/* Search Input */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-slate-800/80 px-3 py-1.5 shadow-xl bg-slate-950/90 backdrop-blur-md">
              <input
                type="text"
                placeholder="Search nearby..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-white text-xs font-medium placeholder-slate-500 focus:outline-none w-full sm:w-48"
              />
              {searchQuery ? (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white transition-colors text-[10px] cursor-pointer">✕</button>
              ) : (
                <span className="text-slate-500 text-xs">🔍</span>
              )}
            </div>

            {/* Dynamic Category Filter Pills */}
            <div className="flex items-center gap-1.5 no-scrollbar overflow-x-auto w-full max-w-[90vw] md:max-w-md py-0.5">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap cursor-pointer border transition-all active:scale-95 ${
                  selectedCategory === 'All'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-lg shadow-emerald-500/20'
                    : 'border-slate-800/80 text-slate-400 hover:text-white bg-slate-950/90 backdrop-blur-md'
                }`}
              >
                🌐 All
              </button>
              {categories.map((cat) => {
                const isSel = selectedCategory === cat.name;
                return (
                  <button
                    key={cat._id || cat.id}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap cursor-pointer border transition-all active:scale-95 flex items-center gap-1 ${
                      isSel
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-lg shadow-emerald-500/20'
                        : 'border-slate-800/80 text-slate-400 hover:text-white bg-slate-950/90 backdrop-blur-md'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>

          </div>
        )}

      </div>

      {/* ── Step-by-Step Navigation Instructions Drawer ── */}
      {showSteps && selectedFacility && navigationSteps.length > 0 && (
        <div className="absolute inset-x-3 bottom-28 z-50 max-w-sm mx-auto rounded-3xl p-5 shadow-2xl space-y-4" style={{ background: 'rgba(2,6,23,0.96)', border: '1px solid rgba(30,41,59,0.8)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <span>📋 Step-by-Step Directions</span>
            </h4>
            <button
              onClick={() => setShowSteps(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {navigationSteps.map((step, index) => (
              <div key={index} className="flex items-start gap-3 text-xs text-slate-300">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-slate-200" dangerouslySetInnerHTML={{ __html: step.instructions }} />
                  <p className="text-[10px] text-slate-500 mt-0.5">{step.distance.text} · {step.duration.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Google Map Container ── */}
      <div ref={mapRef} className="flex-1 w-full h-full relative z-10" />

      {/* ── Map Type Switcher Buttons (Bottom Right) ── */}
      <div className="absolute bottom-28 right-3 z-30 flex flex-col gap-1.5">
        {MAP_TYPES.map((type) => {
          const isSelected = mapType === type.key;
          return (
            <button
              key={type.key}
              onClick={() => setMapType(type.key)}
              className={`w-10 h-10 rounded-xl text-sm flex items-center justify-center shadow-xl backdrop-blur-md cursor-pointer transition-all active:scale-95 border ${
                isSelected
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/30'
                  : 'bg-slate-950/92 text-slate-300 border-slate-800/80 hover:bg-slate-900'
              }`}
              title={type.label}
            >
              {type.icon}
            </button>
          );
        })}
      </div>

      {/* ── Bottom Info Bar ── */}
      <div className="absolute bottom-3 left-3 right-3 z-30 max-w-xl mx-auto">
        {selectedFacility ? (
          /* Selected destination metrics */
          <div className="bg-slate-950/95 border border-slate-800/90 rounded-2xl p-3 md:p-4 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            
            <div className="flex items-center gap-2.5 pb-2 sm:pb-0 border-b border-slate-800/80 sm:border-none min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                🚶
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] uppercase font-bold tracking-widest text-slate-500 truncate">
                  Navigating To Google Map Listing
                </p>
                <h4 className="text-xs md:text-sm font-black text-white leading-tight truncate">
                  {selectedFacility.name}
                </h4>
              </div>
            </div>

            <div className="hidden sm:block h-8 w-px bg-slate-800 shrink-0" />

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-4 shrink-0">
              <div className="flex items-center gap-2 bg-slate-900/50 sm:bg-transparent p-2 sm:p-0 rounded-lg border border-slate-800/40 sm:border-none">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  🕒
                </div>
                <div>
                  <p className="text-[8px] uppercase font-bold tracking-wider text-slate-500">Walk Time</p>
                  <h4 className="text-xs md:text-sm font-black text-white whitespace-nowrap">{durationText}</h4>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-900/50 sm:bg-transparent p-2 sm:p-0 rounded-lg border border-slate-800/40 sm:border-none">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  🗺️
                </div>
                <div>
                  <p className="text-[8px] uppercase font-bold tracking-wider text-slate-500">Distance</p>
                  <h4 className="text-xs md:text-sm font-black text-white whitespace-nowrap">{distanceText}</h4>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* No destination selected - show status */
          <div className="bg-slate-950/95 border border-slate-800/90 rounded-2xl p-3 shadow-2xl backdrop-blur-md text-center">
            <p className="text-xs text-slate-400">
              <span className="text-white font-bold">📍 {activeOrigin?.name || 'Loading Location...'}</span>
              <span className="mx-2 text-slate-700">·</span>
              {gpsError ? (
                <span className="text-amber-400">{gpsError}</span>
              ) : (
                <span>Tap any marker to calculate walking path</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Powered by Confluxaa */}
      <div className="absolute bottom-24 left-0 right-0 z-20 text-center">
        <span className="text-[9px] text-slate-600 font-medium bg-slate-950/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
          Powered by{' '}
          <span className="font-extrabold text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text">
            Confluxaa
          </span>
        </span>
      </div>
    </div>
  );
}
