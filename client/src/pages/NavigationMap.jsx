import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';
import Loading from '../components/Loading';

/* ────────────────────────────────────────────
   Facility-type colour palette
   ──────────────────────────────────────────── */
const TYPE_CONFIG = {
  Medical: { color: '#ef4444', bg: 'bg-red-500',    ring: 'shadow-red-500/40',    emoji: '🚑', label: 'Medical Center' },
  Toilet:  { color: '#06b6d4', bg: 'bg-cyan-500',   ring: 'shadow-cyan-500/40',   emoji: '🚻', label: 'Restroom' },
  Police:  { color: '#6366f1', bg: 'bg-indigo-500', ring: 'shadow-indigo-500/40', emoji: '🚨', label: 'Security / Police' },
  Help:    { color: '#14b8a6', bg: 'bg-teal-500',   ring: 'shadow-teal-500/40',   emoji: 'ℹ️', label: 'Help Desk' },
};

/* ────────────────────────────────────────────
   Map Basemap Tile Options (Standard, Satellite, Dark)
   ──────────────────────────────────────────── */
const MAP_STYLES = {
  standard: {
    label: 'Standard',
    icon: '🗺️',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxNativeZoom: 19,
  },
  dark: {
    label: 'Dark Vector',
    icon: '🌙',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxNativeZoom: 19,
  },
};

/* ────────────────────────────────────────────
   Bearing Angle Math (for Directional Arrows)
   ──────────────────────────────────────────── */
const calculateBearing = (lat1, lon1, lat2, lon2) => {
  const rad = Math.PI / 180;
  const phi1 = lat1 * rad;
  const phi2 = lat2 * rad;
  const deltaLambda = (lon2 - lon1) * rad;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  return bearing;
};

/* ────────────────────────────────────────────
   Cardinal Direction Helper (North, East, etc.)
   ──────────────────────────────────────────── */
const getCardinalDirection = (bearing) => {
  const directions = [
    { label: 'North ⬆️', short: 'N', icon: '⬆️' },
    { label: 'North-East ↗️', short: 'NE', icon: '↗️' },
    { label: 'East ➡️', short: 'E', icon: '➡️' },
    { label: 'South-East ↘️', short: 'SE', icon: '↘️' },
    { label: 'South ⬇️', short: 'S', icon: '⬇️' },
    { label: 'South-West ↙️', short: 'SW', icon: '↙️' },
    { label: 'West ⬅️', short: 'W', icon: '⬅️' },
    { label: 'North-West ↖️', short: 'NW', icon: '↖️' },
  ];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
};

/* ────────────────────────────────────────────
   Custom Leaflet DivIcons per facility type
   ──────────────────────────────────────────── */
const createLocationIcon = (isGps = false, bearing = null) => {
  const color = isGps ? '#3b82f6' : '#6366f1';
  const arrowHtml =
    bearing !== null && bearing !== undefined
      ? `<div style="position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:center;transform:rotate(${bearing}deg);pointer-events:none;z-index:5;">
           <div style="transform:translateY(-12px);filter:drop-shadow(0 3px 8px ${color}cc);">
             <svg style="width:26px;height:26px;fill:${color};stroke:#0f172a;stroke-width:2;stroke-linejoin:round;" viewBox="0 0 24 24">
               <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
             </svg>
           </div>
         </div>`
      : '';

  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:48px;height:48px;">
        <style>@keyframes markerPing{0%{transform:scale(1);opacity:1}75%,100%{transform:scale(2.2);opacity:0}}</style>
        <span style="position:absolute;inset:8px;background:${isGps ? 'rgba(59,130,246,0.35)' : 'rgba(99,102,241,0.25)'};border-radius:50%;animation:markerPing 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>
        ${arrowHtml}
        <div style="width:28px;height:28px;border-radius:50%;background:${isGps ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)'};border:3px solid #0f172a;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px ${color}88;z-index:2;">
          <div style="width:9px;height:9px;border-radius:50%;background:#fff;"></div>
        </div>
      </div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
};

const createFacilityIcon = (type, isSelected = false) => {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.Medical;
  const size = isSelected ? 42 : 32;
  const inner = isSelected ? 34 : 26;
  const border = isSelected ? 4 : 3;
  const pulse = isSelected
    ? `<style>@keyframes markerPing{0%{transform:scale(1);opacity:1}75%,100%{transform:scale(2);opacity:0}}</style><span style="position:absolute;inset:0;background:${cfg.color}33;border-radius:50%;animation:markerPing 1.5s cubic-bezier(0,0,0.2,1) infinite;pointer-events:none;"></span>`
    : '';

  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;cursor:pointer;">
        ${pulse}
        <div style="width:${inner}px;height:${inner}px;border-radius:50%;background:${cfg.color};border:${border}px solid #0f172a;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px ${cfg.color}66;font-size:${isSelected ? 16 : 12}px;pointer-events:none;">
          ${cfg.emoji}
        </div>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

/* ────────────────────────────────────────────
   Auto-fit map bounds helper component
   ──────────────────────────────────────────── */
function FitBounds({ bounds, selectedFacility }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      const maxZ = selectedFacility ? 19 : 18;
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: maxZ });
    }
  }, [map, bounds, selectedFacility]);
  return null;
}

/* ────────────────────────────────────────────
   Custom Floating Map Control Buttons (+ / - / 🎯)
   ──────────────────────────────────────────── */
function MapControlsWidget({ onRecenter, mapStyleKey, setMapStyleKey }) {
  const map = useMap();
  return (
    <>
      {/* Zoom controls — bottom right */}
      <div className="absolute bottom-32 right-3 z-30 flex flex-col gap-1.5">
        <button
          onClick={() => map.zoomIn()}
          title="Zoom In"
          className="w-11 h-11 rounded-2xl bg-slate-950/92 hover:bg-slate-900 border border-slate-800/80 text-white font-black text-xl flex items-center justify-center shadow-2xl backdrop-blur-md cursor-pointer transition-all active:scale-95"
        >+</button>
        <button
          onClick={() => map.zoomOut()}
          title="Zoom Out"
          className="w-11 h-11 rounded-2xl bg-slate-950/92 hover:bg-slate-900 border border-slate-800/80 text-white font-black text-xl flex items-center justify-center shadow-2xl backdrop-blur-md cursor-pointer transition-all active:scale-95"
        >−</button>
        <button
          onClick={onRecenter}
          title="Recenter"
          className="w-11 h-11 rounded-2xl bg-slate-950/92 hover:bg-slate-900 border border-slate-800/80 text-emerald-400 text-base flex items-center justify-center shadow-2xl backdrop-blur-md cursor-pointer transition-all active:scale-95"
        >🎯</button>
      </div>

      {/* Map style switcher — bottom right below zoom */}
      <div className="absolute bottom-3 right-3 z-30 flex flex-col gap-1">
        {Object.entries(MAP_STYLES).map(([key, style]) => {
          const isSelected = mapStyleKey === key;
          return (
            <button
              key={key}
              onClick={() => setMapStyleKey(key)}
              className={`w-11 h-11 rounded-2xl text-sm flex items-center justify-center shadow-xl backdrop-blur-md cursor-pointer transition-all active:scale-95 border ${
                isSelected
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/30'
                  : 'bg-slate-950/92 text-slate-300 border-slate-800/80 hover:bg-slate-900'
              }`}
              title={style.label}
            >{style.icon}</button>
          );
        })}
      </div>
    </>
  );
}

/* ════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════ */
export default function NavigationMap() {
  const { locationId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const destinationParam = searchParams.get('destination');

  const [location, setLocation] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── GPS Tracking & UI State ──
  const [legendOpen, setLegendOpen] = useState(false);
  const [useLiveGps, setUseLiveGps] = useState(false);
  const [gpsPosition, setGpsPosition] = useState(null);
  const [gpsError, setGpsError] = useState(null);

  // ── Fetch all facilities near this location ──
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/facilities/near/${locationId}`);
        setLocation(res.location);
        setFacilities(res.facilities || []);

        // Auto-select destination from query param
        if (destinationParam && res.facilities) {
          const match = res.facilities.find(
            (f) => f.name === destinationParam || f.id === destinationParam
          );
          if (match) setSelectedFacility(match);
        }
      } catch (err) {
        setError(err.message || 'Failed to load venue map data.');
      } finally {
        setLoading(false);
      }
    };
    if (locationId) fetchData();
  }, [locationId, destinationParam]);

  // ── GPS Tracking Hook ──
  useEffect(() => {
    let watchId;
    if (useLiveGps && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setGpsPosition({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          setGpsError(null);
        },
        (err) => {
          console.warn('GPS error:', err);
          setGpsError(err.message || 'Unable to fetch GPS position');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGpsPosition(null);
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [useLiveGps]);

  // ── Active Origin (Live GPS or Scanned Gate) ──
  const activeOrigin = useMemo(() => {
    if (useLiveGps && gpsPosition) {
      return {
        latitude: gpsPosition.latitude,
        longitude: gpsPosition.longitude,
        name: 'Live Device GPS',
        isGps: true,
      };
    }
    return location ? { ...location, isGps: false } : null;
  }, [useLiveGps, gpsPosition, location]);

  // ── Haversine Calculation ──
  const dynamicNavigationStats = useMemo(() => {
    if (!activeOrigin || !selectedFacility) return null;
    const R = 6371000;
    const rad = Math.PI / 180;
    const dLat = (selectedFacility.latitude - activeOrigin.latitude) * rad;
    const dLon = (selectedFacility.longitude - activeOrigin.longitude) * rad;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(activeOrigin.latitude * rad) *
        Math.cos(selectedFacility.latitude * rad) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    const walkingTimeMinutes = Math.max(1, Math.round(d / 80));
    return {
      distanceFormatted: d > 1000 ? `${(d / 1000).toFixed(1)}km` : `${Math.round(d)}m`,
      walkingTimeFormatted: `${walkingTimeMinutes} min${walkingTimeMinutes > 1 ? 's' : ''}`,
    };
  }, [activeOrigin, selectedFacility]);

  // ── Polyline & Midpoint Direction Arrow ──
  const polylineData = useMemo(() => {
    if (!activeOrigin || !selectedFacility) return null;
    const p1 = [activeOrigin.latitude, activeOrigin.longitude];
    const p2 = [selectedFacility.latitude, selectedFacility.longitude];
    const midpoint = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    const bearing = calculateBearing(p1[0], p1[1], p2[0], p2[1]);
    return {
      path: [p1, p2],
      midpoint,
      bearing,
    };
  }, [activeOrigin, selectedFacility]);

  // ── Compute map bounds ──
  const mapBounds = useMemo(() => {
    if (!activeOrigin) return null;
    const points = [[activeOrigin.latitude, activeOrigin.longitude]];
    if (selectedFacility) {
      points.push([selectedFacility.latitude, selectedFacility.longitude]);
    } else {
      if (location && activeOrigin.isGps) {
        points.push([location.latitude, location.longitude]);
      }
      facilities.forEach((f) => points.push([f.latitude, f.longitude]));
    }
    return points.length >= 2 ? points : null;
  }, [activeOrigin, selectedFacility, location, facilities]);

  // ── Advanced Google Maps Style UI State ──
  const [mapStyleKey, setMapStyleKey] = useState('standard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showSteps, setShowSteps] = useState(false);

  const activeMapStyle = MAP_STYLES[mapStyleKey] || MAP_STYLES.standard;

  // ── Filtered Facilities ──
  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      const matchesCat = selectedCategory === 'All' || f.type === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' || f.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [facilities, selectedCategory, searchQuery]);

  const cardinalDirection = polylineData ? getCardinalDirection(polylineData.bearing) : null;
  const travelTimeText = dynamicNavigationStats?.walkingTimeFormatted || selectedFacility?.walkingTimeFormatted;
  const distanceText = dynamicNavigationStats?.distanceFormatted || selectedFacility?.distanceFormatted;

  const handleRecenter = () => {
    if (!activeOrigin) return;
  };

  const handleNavigateTo = (facility) => {
    setSelectedFacility(facility);
    setSearchParams({ destination: facility.name });
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loading message="Loading interactive venue map..." />
      </div>
    );
  }

  /* ── Error ── */
  if (error || !location) {
    return (
      <div className="max-w-md mx-auto my-12 bg-slate-900 border border-red-500/20 rounded-2xl p-8 text-center shadow-xl">
        <h2 className="text-xl font-bold text-white mb-2">Map Error</h2>
        <p className="text-slate-400 text-sm mb-6">{error || 'Location data unavailable.'}</p>
        <Link
          to={`/location/${locationId}`}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
        >
          Back to Location
        </Link>
      </div>
    );
  }

  return (
    <div className="relative h-[88vh] md:h-[90vh] min-h-[550px] w-full rounded-2xl overflow-hidden flex flex-col animate-fade-in" style={{ boxShadow: '0 0 0 1px rgba(30,41,59,0.6), 0 30px 80px rgba(0,0,0,0.6)' }}>
      
      {/* ── Top Google Maps Turn-by-Turn Header Banner (When Navigating) ── */}
      {selectedFacility && (
        <div className="absolute top-0 left-0 right-0 z-40 text-white px-4 py-3 shadow-2xl backdrop-blur-xl flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', borderBottom: '1px solid rgba(52,211,153,0.3)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/12 border border-white/15 flex items-center justify-center text-xl shrink-0">
              {cardinalDirection ? cardinalDirection.icon : '⬆️'}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-black tracking-widest text-emerald-100/80 flex items-center gap-1.5">
                <span>Navigation</span>
                <span className="opacity-40">·</span>
                <span>{travelTimeText} walk</span>
              </p>
              <h3 className="text-sm font-black text-white truncate leading-tight">
                Head {cardinalDirection ? cardinalDirection.label : ''} → {selectedFacility.name}
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
              }}
              className="w-8 h-8 rounded-xl bg-slate-950/40 hover:bg-slate-950/70 text-white font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
              title="Exit Navigation"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Top Control Bar — compact unified pill ── */}
      <div className={`absolute ${selectedFacility ? 'top-16' : 'top-3'} left-3 z-30 flex items-center gap-1.5 transition-all duration-200`}>
        {/* Back pill */}
        <Link
          to={`/location/${locationId}`}
          className="inline-flex items-center gap-1.5 py-2 px-3 rounded-2xl text-xs font-bold text-white transition-all active:scale-95 border border-slate-800/80"
          style={{ background: 'rgba(2,6,23,0.88)', backdropFilter: 'blur(16px)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>

        {/* GPS toggle */}
        <button
          onClick={() => setUseLiveGps(!useLiveGps)}
          className={`inline-flex items-center gap-1.5 py-2 px-3 rounded-2xl font-bold text-xs transition-all border cursor-pointer active:scale-95 ${
            useLiveGps
              ? 'bg-blue-600 border-blue-400/50 text-white'
              : 'border-slate-800/80 text-slate-300 hover:text-white'
          }`}
          style={!useLiveGps ? { background: 'rgba(2,6,23,0.88)', backdropFilter: 'blur(16px)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' } : {}}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${useLiveGps ? 'bg-white animate-ping' : 'bg-blue-400'}`} />
          {useLiveGps ? 'GPS On' : 'GPS'}
        </button>
      </div>

      {/* ── Search collapsible chip (overview mode only) ── */}
      {!selectedFacility && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2">
          {/* Search trigger chip */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-slate-800/80 px-3 py-1.5" style={{ background: 'rgba(2,6,23,0.88)', backdropFilter: 'blur(16px)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
            <input
              type="text"
              placeholder="Search facilities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-white text-xs font-medium placeholder-slate-500 focus:outline-none w-36 sm:w-48"
            />
            {searchQuery ? (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white transition-colors text-[10px] cursor-pointer">✕</button>
            ) : (
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>

          {/* Category filter pills */}
          <div className="flex items-center gap-1 no-scrollbar overflow-x-auto max-w-xs sm:max-w-sm">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap cursor-pointer border transition-all active:scale-95 ${
                selectedCategory === 'All'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'border-slate-800/80 text-slate-400 hover:text-white'
              }`}
              style={selectedCategory !== 'All' ? { background: 'rgba(2,6,23,0.88)', backdropFilter: 'blur(12px)' } : {}}
            >All {facilities.length}</button>
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
              const count = facilities.filter((f) => f.type === key).length;
              const isSel = selectedCategory === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap cursor-pointer border transition-all active:scale-95 flex items-center gap-1 ${
                    isSel ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'border-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                  style={!isSel ? { background: 'rgba(2,6,23,0.88)', backdropFilter: 'blur(12px)' } : {}}
                >
                  <span>{cfg.emoji}</span>{count}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Step-by-Step Navigation Instructions Drawer ── */}
      {showSteps && selectedFacility && (
        <div className="absolute inset-x-3 bottom-28 z-50 max-w-sm mx-auto rounded-3xl p-5 shadow-2xl space-y-4" style={{ background: 'rgba(2,6,23,0.96)', border: '1px solid rgba(30,41,59,0.8)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <span>📋 Step-by-Step Directions</span>
            </h4>
            <button
              onClick={() => setShowSteps(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto">
            {/* Step 1 */}
            <div className="flex items-start gap-3 text-xs text-slate-300">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                1
              </span>
              <div>
                <p className="font-bold text-white">Start at {activeOrigin?.name || location.name}</p>
                <p className="text-[10px] text-slate-500">Scan Point / Device GPS Location</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 text-xs text-slate-300">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                2
              </span>
              <div>
                <p className="font-bold text-white">
                  Head {cardinalDirection ? cardinalDirection.label : ''} for {distanceText}
                </p>
                <p className="text-[10px] text-slate-500">
                  Follow green dashed navigation line on map (~{travelTimeText} walk)
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 text-xs text-slate-300">
              <span className="w-6 h-6 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                3
              </span>
              <div>
                <p className="font-bold text-white">Arrive at {selectedFacility.name}</p>
                <p className="text-[10px] text-slate-500">{selectedFacility.description || 'Target Facility'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Leaflet Map ── */}
      <div className="flex-1 w-full h-full relative z-10">
        <MapContainer
          center={[activeOrigin.latitude, activeOrigin.longitude]}
          zoom={18}
          maxZoom={20}
          zoomControl={false}
          scrollWheelZoom={true}
          className="w-full h-full"
          style={{ background: '#e8e0d8' }}
        >
          <TileLayer
            attribution={activeMapStyle.attribution}
            url={activeMapStyle.url}
            maxZoom={20}
            maxNativeZoom={activeMapStyle.maxNativeZoom}
          />

          {/* Custom Floating Zoom/Recenter + Map Style Switcher */}
          <MapControlsWidget onRecenter={handleRecenter} mapStyleKey={mapStyleKey} setMapStyleKey={setMapStyleKey} />

          {/* Auto-fit bounds */}
          {mapBounds && <FitBounds bounds={mapBounds} selectedFacility={selectedFacility} />}

          {/* Scanned Gate Origin Marker */}
          {location && (
            <Marker
              position={[location.latitude, location.longitude]}
              icon={createLocationIcon(false, !useLiveGps ? polylineData?.bearing : null)}
            >
              <Popup>
                <div className="text-slate-900 font-sans p-1">
                  <h4 className="font-bold text-xs">📍 Scanned Location</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">{location.name}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Live Device GPS Marker */}
          {useLiveGps && gpsPosition && (
            <Marker
              position={[gpsPosition.latitude, gpsPosition.longitude]}
              icon={createLocationIcon(true, polylineData?.bearing)}
            >
              <Popup>
                <div className="text-slate-900 font-sans p-1">
                  <h4 className="font-bold text-xs">💙 Your Live GPS Location</h4>
                  <p className="text-[10px] text-blue-600 mt-0.5">Accuracy: ~{Math.round(gpsPosition.accuracy)}m</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Facility Markers */}
          {filteredFacilities.map((f) => {
            const isSelected = selectedFacility && selectedFacility.id === f.id;
            return (
              <Marker
                key={f.id}
                position={[f.latitude, f.longitude]}
                icon={createFacilityIcon(f.type, isSelected)}
              >
                <Popup>
                  <div className="font-sans p-1 min-w-[160px]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">{TYPE_CONFIG[f.type]?.emoji || '📍'}</span>
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${TYPE_CONFIG[f.type]?.color || '#6366f1'}22`,
                          color: TYPE_CONFIG[f.type]?.color || '#6366f1',
                        }}
                      >
                        {f.type}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900">{f.name}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {f.distanceFormatted} · {f.walkingTimeFormatted} walk
                    </p>
                    {!isSelected && (
                      <button
                        onClick={() => handleNavigateTo(f)}
                        className="mt-2 w-full text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg text-white cursor-pointer"
                        style={{ backgroundColor: TYPE_CONFIG[f.type]?.color || '#6366f1' }}
                      >
                        Navigate Here →
                      </button>
                    )}
                    {isSelected && (
                      <p className="mt-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                        ✓ Current Destination
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Directional Route Polyline */}
          {polylineData && (
            <Polyline
              positions={polylineData.path}
              pathOptions={{
                color: TYPE_CONFIG[selectedFacility?.type]?.color || '#10b981',
                weight: 6,
                dashArray: '8, 10',
                lineCap: 'round',
                opacity: 0.95,
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* ── Bottom Info Bar ── */}
      <div className="absolute bottom-3 left-3 right-3 z-30 max-w-xl mx-auto">
        {selectedFacility ? (
          /* Selected destination info */
          <div className="bg-slate-950/95 border border-slate-800/90 rounded-2xl p-3 md:p-4 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            
            {/* Navigating to section */}
            <div className="flex items-center gap-2.5 pb-2 sm:pb-0 border-b border-slate-800/80 sm:border-none min-w-0 flex-1">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                style={{
                  backgroundColor: `${TYPE_CONFIG[selectedFacility.type]?.color || '#6366f1'}15`,
                  border: `1px solid ${TYPE_CONFIG[selectedFacility.type]?.color || '#6366f1'}33`,
                }}
              >
                {TYPE_CONFIG[selectedFacility.type]?.emoji || '📍'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] uppercase font-bold tracking-widest text-slate-500 truncate">
                  Navigating To ({activeOrigin?.isGps ? 'Live GPS' : 'QR Gate'})
                </p>
                <h4 className="text-xs md:text-sm font-black text-white leading-tight truncate">
                  {selectedFacility.name}
                </h4>
              </div>
            </div>

            {/* Middle separator for desktop */}
            <div className="hidden sm:block h-8 w-px bg-slate-800 shrink-0" />

            {/* Travel and Distance metrics side-by-side */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-4 shrink-0">
              {/* Metric 1: Travel */}
              <div className="flex items-center gap-2 bg-slate-900/50 sm:bg-transparent p-2 sm:p-0 rounded-lg border border-slate-800/40 sm:border-none">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[8px] uppercase font-bold tracking-wider text-slate-500">Travel</p>
                  <h4 className="text-xs md:text-sm font-black text-white whitespace-nowrap">{travelTimeText}</h4>
                </div>
              </div>

              {/* Metric 2: Distance */}
              <div className="flex items-center gap-2 bg-slate-900/50 sm:bg-transparent p-2 sm:p-0 rounded-lg border border-slate-800/40 sm:border-none">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-[8px] uppercase font-bold tracking-wider text-slate-500">
                    Dist ({cardinalDirection?.short || 'N'})
                  </p>
                  <h4 className="text-xs md:text-sm font-black text-white whitespace-nowrap">{distanceText}</h4>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* No destination selected — prompt */
          <div className="bg-slate-950/95 border border-slate-800/90 rounded-2xl p-3 shadow-2xl backdrop-blur-md text-center">
            <p className="text-xs text-slate-400">
              <span className="text-white font-bold">📍 {activeOrigin?.name || location.name}</span>
              <span className="mx-2 text-slate-700">·</span>
              Tap any facility marker to navigate
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

