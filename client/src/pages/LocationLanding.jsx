import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import Loading from '../components/Loading';
import { useTranslation } from '../context/LanguageContext';

/* ── Facility Config ─────────────────────────────── */
const FACILITY_CONFIG = {
  Medical: {
    emoji: '🚑', label: 'Medical Care',
    color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)',
    navBg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    shadow: 'rgba(16,185,129,0.25)',
  },
  Help: {
    emoji: 'ℹ️', label: 'Help Desk',
    color: '#14b8a6', bg: 'rgba(20,184,166,0.08)', border: 'rgba(20,184,166,0.2)',
    navBg: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
    shadow: 'rgba(20,184,166,0.25)',
  },
  Toilet: {
    emoji: '🚻', label: 'Restroom',
    color: '#06b6d4', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)',
    navBg: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
    shadow: 'rgba(6,182,212,0.25)',
  },
  Police: {
    emoji: '🛡️', label: 'Security',
    color: '#818cf8', bg: 'rgba(129,140,248,0.08)', border: 'rgba(129,140,248,0.2)',
    navBg: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
    shadow: 'rgba(129,140,248,0.25)',
  },
};

/* ── FacilityCard ────────────────────────────────── */
function FacilityCard({ type, data, locationSlug }) {
  const { t } = useTranslation();
  const cfg = FACILITY_CONFIG[type] || FACILITY_CONFIG.Medical;
  const name = data?.name || '—';
  const distance = data?.distanceFormatted || '—';
  const walkTime = data?.walkingTimeFormatted || '—';

  return (
    <div
      className="relative rounded-2xl p-4 flex flex-col gap-3 transition-all duration-200 group bg-white"
      style={{
        border: `1px solid ${cfg.border}`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
      }}
    >
      {/* Left accent strip */}
      <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full" style={{ background: cfg.color }} />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{cfg.emoji}</span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
              {cfg.label}
            </p>
            <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">{name}</h3>
          </div>
        </div>
      </div>

      {/* Distance & time */}
      <div className="flex items-center gap-3 pl-2">
        <span className="flex items-center gap-1 text-xs font-bold" style={{ color: cfg.color }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {distance}
        </span>
        <span className="text-slate-400">·</span>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {walkTime}
        </span>
      </div>

      {/* Navigate link */}
      <Link
        to={`/map/${locationSlug}?destination=${encodeURIComponent(name)}`}
        className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold text-white transition-all duration-200 active:scale-95"
        style={{ background: cfg.navBg, boxShadow: `0 4px 14px ${cfg.shadow}` }}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        {t('navigate')} →
      </Link>
    </div>
  );
}

/* ── Main Component ──────────────────────────────── */
export default function LocationLanding() {
  const { locationId } = useParams();
  const { t } = useTranslation();
  const [location, setLocation] = useState(null);
  const [medical, setMedical] = useState(null);
  const [toilet, setToilet] = useState(null);
  const [police, setPolice] = useState(null);
  const [help, setHelp] = useState(null);
  const [sosActive, setSosActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLocationData = async () => {
      setLoading(true);
      setError(null);
      try {
        const locationResponse = await api.get(`/location/${locationId}`);
        const resolvedLocation = locationResponse.data;
        setLocation(resolvedLocation);

        const fetchFacility = async (type, setter) => {
          try {
            const res = await api.get(`/medical/nearest/${resolvedLocation._id || resolvedLocation.id}?type=${type}`);
            if (res && res.success && res.data) {
              setter(res.data);
            } else {
              setter(null);
            }
          } catch {
            setter(null);
          }
        };

        await Promise.all([
          fetchFacility('Medical', setMedical),
          fetchFacility('Toilet', setToilet),
          fetchFacility('Police', setPolice),
          fetchFacility('Help', setHelp),
        ]);
      } catch (err) {
        setError(err.message || 'Failed to load location.');
      } finally {
        setLoading(false);
      }
    };

    if (locationId) fetchLocationData();
  }, [locationId]);

  /* ── Loading ── */
  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loading message="Resolving scanned location..." />
    </div>
  );

  /* ── Error ── */
  if (error || !location) return (
    <div className="max-w-sm mx-auto my-12 text-center space-y-4 animate-fade-slide-up">
      <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-2xl">⚠️</div>
      <h2 className="text-xl font-black text-slate-900">Scan Failed</h2>
      <p className="text-sm text-slate-500">{error || 'Location data unavailable.'}</p>
      <Link to="/" className="inline-flex items-center gap-2 py-2.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-colors">
        ← Back to Home
      </Link>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto py-6 px-4 animate-fade-slide-up space-y-5">

      {/* ── SOS Modal ── */}
      {sosActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in text-slate-800">
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

      {/* ── Top Status Bar ── */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {t('scanConfirmed')}
        </div>
        <button
          onClick={() => setSosActive(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-300/60 bg-red-50 text-red-600 text-[11px] font-bold transition-all hover:bg-red-100 cursor-pointer"
        >
          🚨 SOS
        </button>
      </div>

      {/* ── Hero Location Card ── */}
      <div
        className="rounded-3xl p-6 relative overflow-hidden bg-white border border-slate-200"
        style={{
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
        }}
      >
        {/* Background glow */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-indigo-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none" />

        <div className="relative space-y-4">
          {/* Location pin icon */}
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', boxShadow: '0 8px 20px rgba(99,102,241,0.25)' }}>
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{t('youAreHere')}</p>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">{location?.name}</h1>
            {location?.description && (
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{location.description}</p>
            )}
          </div>

          {/* Primary CTA — Open Map */}
          <Link
            to={`/map/${location?.slug}`}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl text-sm font-bold text-white transition-all duration-200 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)',
              boxShadow: '0 8px 24px rgba(99,102,241,0.3)'
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            {t('openMapBtn')}
          </Link>
        </div>
      </div>

      {/* ── Nearby Facilities Section ── */}
      {(medical || help || toilet || police) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900">{t('nearbyFacilities')}</h2>
            <span className="text-[11px] text-slate-500 font-medium">{t('tapToNavigate')}</span>
          </div>

          {/* 2-column dynamic grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {medical && <FacilityCard type="Medical" data={medical} locationSlug={location?.slug} />}
            {help && <FacilityCard type="Help" data={help} locationSlug={location?.slug} />}
            {toilet && <FacilityCard type="Toilet" data={toilet} locationSlug={location?.slug} />}
            {police && <FacilityCard type="Police" data={police} locationSlug={location?.slug} />}
          </div>
        </div>
      )}

      {/* ── Powered by footer ── */}
      <div className="text-center text-[10px] text-slate-500 font-medium pt-2">
        Powered by{' '}
        <a href="https://confluxaa.com" target="_blank" rel="noopener noreferrer"
          className="font-extrabold text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text hover:opacity-80 transition-opacity">
          Confluxaa
        </a>
      </div>
    </div>
  );
}
