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
   Custom Leaflet DivIcons per facility type
   ──────────────────────────────────────────── */
const createLocationIcon = () =>
  L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:36px;height:36px;">
        <style>@keyframes markerPing{0%{transform:scale(1);opacity:1}75%,100%{transform:scale(2);opacity:0}}</style>
        <span style="position:absolute;inset:0;background:rgba(99,102,241,0.25);border-radius:50%;animation:markerPing 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>
        <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:3px solid #0f172a;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(99,102,241,0.4);">
          <div style="width:8px;height:8px;border-radius:50%;background:#fff;"></div>
        </div>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

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
function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
    }
  }, [map, bounds]);
  return null;
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

  // ── Navigate-to handler from popup ──
  const handleNavigateTo = (facility) => {
    setSelectedFacility(facility);
    setSearchParams({ destination: facility.name });
  };

  // ── Compute map bounds ──
  const mapBounds = useMemo(() => {
    if (!location) return null;
    const points = [[location.latitude, location.longitude]];
    facilities.forEach((f) => points.push([f.latitude, f.longitude]));
    return points.length >= 2 ? points : null;
  }, [location, facilities]);

  // ── Polyline to selected destination ──
  const polylinePath = useMemo(() => {
    if (!location || !selectedFacility) return null;
    return [
      [location.latitude, location.longitude],
      [selectedFacility.latitude, selectedFacility.longitude],
    ];
  }, [location, selectedFacility]);

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
    <div className="relative h-[92vh] min-h-[500px] w-full border border-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
      {/* ── Back Button ── */}
      <div className="absolute top-4 left-4 z-30">
        <Link
          to={`/location/${locationId}`}
          className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-slate-950/80 hover:bg-slate-950 text-white font-medium shadow-lg backdrop-blur-md transition-all text-sm border border-slate-800"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
      </div>

      {/* ── Legend Overlay ── */}
      <div className="absolute top-4 right-4 z-30 bg-slate-950/85 border border-slate-800 rounded-xl px-3 py-2.5 backdrop-blur-md shadow-lg">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Facilities</p>
        <div className="space-y-1">
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-2 text-xs text-slate-300">
              <span className="text-sm">{cfg.emoji}</span>
              <span className="font-medium">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Leaflet Map ── */}
      <div className="flex-1 w-full h-full relative z-10">
        <MapContainer
          center={[location.latitude, location.longitude]}
          zoom={16}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Auto-fit bounds */}
          {mapBounds && <FitBounds bounds={mapBounds} />}

          {/* Current Location Marker */}
          <Marker position={[location.latitude, location.longitude]} icon={createLocationIcon()}>
            <Popup>
              <div className="text-slate-900 font-sans p-1">
                <h4 className="font-bold text-xs">📍 You Are Here</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">{location.name}</p>
              </div>
            </Popup>
          </Marker>

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

          {/* Route Polyline to selected destination */}
          {polylinePath && (
            <Polyline
              positions={polylinePath}
              pathOptions={{
                color: TYPE_CONFIG[selectedFacility?.type]?.color || '#6366f1',
                weight: 4,
                dashArray: '10, 8',
                lineCap: 'round',
                opacity: 0.85,
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* ── Bottom Info Bar ── */}
      <div className="absolute bottom-4 left-4 right-4 z-30 max-w-lg mx-auto">
        {selectedFacility ? (
          /* Selected destination info */
          <div className="bg-slate-950/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-md flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{
                  backgroundColor: `${TYPE_CONFIG[selectedFacility.type]?.color || '#6366f1'}15`,
                  border: `1px solid ${TYPE_CONFIG[selectedFacility.type]?.color || '#6366f1'}33`,
                }}
              >
                {TYPE_CONFIG[selectedFacility.type]?.emoji || '📍'}
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Navigating To
                </p>
                <h4 className="text-sm font-black text-white leading-tight">
                  {selectedFacility.name}
                </h4>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-800" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Travel</p>
                <h4 className="text-sm font-black text-white">{selectedFacility.walkingTimeFormatted}</h4>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-800" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Distance</p>
                <h4 className="text-sm font-black text-white">{selectedFacility.distanceFormatted}</h4>
              </div>
            </div>
          </div>
        ) : (
          /* No destination selected — prompt */
          <div className="bg-slate-950/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-md text-center">
            <p className="text-xs text-slate-400">
              <span className="text-white font-bold">📍 {location.name}</span>
              <span className="mx-2 text-slate-700">·</span>
              Tap any facility marker to navigate
            </p>
          </div>
        )}
      </div>

      {/* Powered by Confluxaa */}
      <div className="absolute bottom-20 left-0 right-0 z-20 text-center">
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
