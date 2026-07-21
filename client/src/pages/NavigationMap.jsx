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
    { label: 'North ⬆️', short: 'N' },
    { label: 'North-East ↗️', short: 'NE' },
    { label: 'East ➡️', short: 'E' },
    { label: 'South-East ↘️', short: 'SE' },
    { label: 'South ⬇️', short: 'S' },
    { label: 'South-West ↙️', short: 'SW' },
    { label: 'West ⬅️', short: 'W' },
    { label: 'North-West ↖️', short: 'NW' },
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
      ? `<div style="position:absolute;top:-6px;left:50%;transform:translateX(-50%) rotate(${bearing}deg);transform-origin:50% 28px;pointer-events:none;z-index:1;">
           <svg style="width:22px;height:22px;fill:${color};filter:drop-shadow(0 2px 6px ${color}aa);" viewBox="0 0 24 24">
             <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
           </svg>
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
function MapControlsWidget({ onRecenter }) {
  const map = useMap();
  return (
    <div className="absolute bottom-28 right-3 z-30 flex flex-col gap-1.5">
      <button
        onClick={() => map.zoomIn()}
        title="Zoom In"
        className="w-10 h-10 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-white font-black text-lg flex items-center justify-center shadow-xl backdrop-blur-md cursor-pointer transition-all active:scale-95"
      >
        +
      </button>
      <button
        onClick={() => map.zoomOut()}
        title="Zoom Out"
        className="w-10 h-10 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-white font-black text-lg flex items-center justify-center shadow-xl backdrop-blur-md cursor-pointer transition-all active:scale-95"
      >
        −
      </button>
      <button
        onClick={onRecenter}
        title="Center Map"
        className="w-10 h-10 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-emerald-400 font-bold text-sm flex items-center justify-center shadow-xl backdrop-blur-md cursor-pointer transition-all active:scale-95"
      >
        🎯
      </button>
    </div>
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
      // Tight focus on origin -> selected destination
      points.push([selectedFacility.latitude, selectedFacility.longitude]);
    } else {
      // Overview mode: include scanned gate and all facilities
      if (location && activeOrigin.isGps) {
        points.push([location.latitude, location.longitude]);
      }
      facilities.forEach((f) => points.push([f.latitude, f.longitude]));
    }
    return points.length >= 2 ? points : null;
  }, [activeOrigin, selectedFacility, location, facilities]);

  // ── Navigate-to handler ──
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

  const cardinalDirection = polylineData ? getCardinalDirection(polylineData.bearing) : null;
  const travelTimeText = dynamicNavigationStats?.walkingTimeFormatted || selectedFacility?.walkingTimeFormatted;
  const distanceText = dynamicNavigationStats?.distanceFormatted || selectedFacility?.distanceFormatted;

  const handleRecenter = () => {
    if (!activeOrigin) return;
    // Recenter map to active origin
  };

  return (
    <div className="relative h-[88vh] md:h-[90vh] min-h-[550px] w-full border border-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
      {/* ── Top Control Bar (Back + Live GPS Toggle) ── */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
        <Link
          to={`/location/${locationId}`}
          className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-slate-950/85 hover:bg-slate-950 text-white font-bold shadow-lg backdrop-blur-md transition-all text-xs border border-slate-800"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>

        {/* Live GPS Toggle Button */}
        <button
          onClick={() => setUseLiveGps(!useLiveGps)}
          className={`inline-flex items-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs shadow-lg backdrop-blur-md transition-all border cursor-pointer ${
            useLiveGps
              ? 'bg-blue-600 border-blue-400 text-white shadow-blue-900/40'
              : 'bg-slate-950/85 border-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${useLiveGps ? 'bg-white animate-ping' : 'bg-blue-500'}`} />
          {useLiveGps ? 'GPS Active' : 'Enable Live GPS'}
        </button>
      </div>

      {/* ── Legend & Compass Overlay ── */}
      <div className="absolute top-3 right-3 z-30 flex flex-col items-end gap-2">
        {/* Cardinal Compass Indicator */}
        <div className="bg-slate-950/85 border border-slate-800 rounded-xl px-2.5 py-1.5 backdrop-blur-md shadow-lg flex items-center gap-1.5 text-xs font-black text-emerald-400">
          <span>🧭</span>
          <span className="text-[10px] tracking-wider uppercase">
            {cardinalDirection ? cardinalDirection.short : 'N'}
          </span>
        </div>

        <button
          onClick={() => setLegendOpen(!legendOpen)}
          className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-950/85 border border-slate-800 text-white font-bold shadow-lg backdrop-blur-md"
        >
          🗺️
        </button>
        <div className={`${legendOpen ? 'block' : 'hidden'} md:block bg-slate-950/85 border border-slate-800 rounded-xl px-3 py-2.5 backdrop-blur-md shadow-lg`}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Facilities</p>
          <div className="space-y-1">
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-2 text-[11px] text-slate-300">
                <span className="text-xs">{cfg.emoji}</span>
                <span className="font-semibold">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Leaflet Map ── */}
      <div className="flex-1 w-full h-full relative z-10">
        <MapContainer
          center={[activeOrigin.latitude, activeOrigin.longitude]}
          zoom={18}
          maxZoom={20}
          zoomControl={false}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={20}
            maxNativeZoom={19}
          />

          {/* Custom Floating Zoom & Recenter Control Buttons */}
          <MapControlsWidget onRecenter={handleRecenter} />

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
          {facilities.map((f) => {
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
            <>
              <Polyline
                positions={polylineData.path}
                pathOptions={{
                  color: TYPE_CONFIG[selectedFacility?.type]?.color || '#6366f1',
                  weight: 5,
                  dashArray: '8, 8',
                  lineCap: 'round',
                  opacity: 0.9,
                }}
              />
            </>
          )}
        </MapContainer>
      </div>

      {/* ── Bottom Info Bar ── */}
      <div className="absolute bottom-3 left-3 right-3 z-30 max-w-md mx-auto">
        {selectedFacility ? (
          /* Selected destination info */
          <div className="bg-slate-950/95 border border-slate-800/90 rounded-2xl p-3 md:p-4 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            
            {/* Navigating to section */}
            <div className="flex items-center gap-2.5 pb-2 sm:pb-0 border-b border-slate-800/80 sm:border-none">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                style={{
                  backgroundColor: `${TYPE_CONFIG[selectedFacility.type]?.color || '#6366f1'}15`,
                  border: `1px solid ${TYPE_CONFIG[selectedFacility.type]?.color || '#6366f1'}33`,
                }}
              >
                {TYPE_CONFIG[selectedFacility.type]?.emoji || '📍'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] uppercase font-bold tracking-widest text-slate-500">
                  Navigating To ({activeOrigin?.isGps ? 'Live GPS' : 'QR Gate'})
                </p>
                <h4 className="text-xs md:text-sm font-black text-white leading-tight truncate">
                  {selectedFacility.name}
                </h4>
              </div>
            </div>

            {/* Middle separator for desktop */}
            <div className="hidden sm:block h-8 w-px bg-slate-800" />

            {/* Travel and Distance metrics side-by-side */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-4">
              {/* Metric 1: Travel */}
              <div className="flex items-center gap-2 bg-slate-900/50 sm:bg-transparent p-2 sm:p-0 rounded-lg border border-slate-800/40 sm:border-none">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[8px] uppercase font-bold tracking-wider text-slate-500">Travel</p>
                  <h4 className="text-xs md:text-sm font-black text-white">{travelTimeText}</h4>
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
                    Heading {cardinalDirection ? cardinalDirection.label : ''}
                  </p>
                  <h4 className="text-xs md:text-sm font-black text-white">{distanceText}</h4>
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

