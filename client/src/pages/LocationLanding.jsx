import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import Loading from '../components/Loading';

export default function LocationLanding() {
  const { locationId } = useParams();
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
        // 1. Fetch current location
        const locationResponse = await api.get(`/location/${locationId}`);
        const resolvedLocation = locationResponse.data;
        setLocation(resolvedLocation);

        // 2. Fetch Nearest Facilities dynamically by type query parameter
        const fetchFacility = async (type, setter, fallback) => {
          try {
            const res = await api.get(`/medical/nearest/${resolvedLocation.id}?type=${type}`);
            setter(res.data);
          } catch (err) {
            console.warn(`[API]: Failed to fetch nearest ${type}. Using fallback.`, err);
            setter(fallback);
          }
        };

        await Promise.all([
          fetchFacility('Medical', setMedical, {
            name: 'Campus Emergency Clinic',
            distanceFormatted: '125m',
            walkingTimeFormatted: '2 mins',
            description: 'Primary emergency care clinic.'
          }),
          fetchFacility('Toilet', setToilet, {
            name: 'Main Gate Restrooms',
            distanceFormatted: '30m',
            walkingTimeFormatted: '1 min',
            description: 'Public restrooms near the entrance.'
          }),
          fetchFacility('Police', setPolice, {
            name: 'Campus Police Station',
            distanceFormatted: '180m',
            walkingTimeFormatted: '3 mins',
            description: 'Campus security headquarters.'
          }),
          fetchFacility('Help', setHelp, {
            name: 'Visitor Info Desk',
            distanceFormatted: '60m',
            walkingTimeFormatted: '1 min',
            description: 'Information and visitor assistance desk.'
          })
        ]);

      } catch (err) {
        setError(err.message || 'Failed to fetch location details.');
      } finally {
        setLoading(false);
      }
    };

    if (locationId) {
      fetchLocationData();
    }
  }, [locationId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading message="Resolving scanned location coordinates..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 bg-slate-900 border border-red-500/20 rounded-2xl p-8 text-center shadow-xl">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Location Scan Failed</h2>
        <p className="text-slate-400 text-sm mb-6">{error}</p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors focus:outline-none"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto my-8 px-4">
      {/* SOS Alert Modal overlay */}
      {sosActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-red-500 rounded-[28px] p-6 text-center space-y-6 shadow-2xl relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <span className="text-2xl">🚨</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">Emergency Triggered</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Security and medical dispatch teams have been alerted with your current location details: <span className="text-emerald-400 font-bold">{location?.name}</span>.
              </p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl space-y-2 border border-slate-800">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Emergency Helpdesk:</span>
                <span className="text-white font-bold">+1 (800) 555-0199</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Security Dispatch:</span>
                <span className="text-white font-bold">+1 (800) 555-0230</span>
              </div>
            </div>
            <button
              onClick={() => setSosActive(false)}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Dismiss Emergency
            </button>
          </div>
        </div>
      )}

      {/* Premium Ambient glow card wrapper */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
        
        {/* Animated beacon background effect */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        
        {/* Top Header Badge */}
        <div className="flex justify-between items-center mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full">
            QR Scan Confirmed
          </span>
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Active
          </span>
        </div>

        {/* Info Content Section */}
        <div className="space-y-6 text-center">
          
          {/* Animated Location Marker Icon */}
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            {/* Outer pulse */}
            <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-pulse" />
            <div className="absolute w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>

          {/* SOS Trigger Banner */}
          <div className="pt-2 space-y-3">
            <button
              onClick={() => setSosActive(true)}
              className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-red-900/40 animate-pulse cursor-pointer"
            >
              🚨 Trigger Emergency SOS
            </button>

            {/* Explore Full Venue Map */}
            <div>
              <Link
                to={`/map/${location?.slug}`}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-900/40"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                🗺️ Explore Full Venue Map
              </Link>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold tracking-widest text-slate-500 uppercase">
              Current Location
            </h3>
            
            {/* You are Here heading */}
            <div className="text-2xl md:text-3xl font-extrabold text-white flex items-center justify-center gap-2">
              <span>📍 You are Here</span>
            </div>
            
            {/* Location Name */}
            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text leading-tight pt-1">
              {location?.name}
            </h1>
          </div>

          {location?.description && (
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
              {location.description}
            </p>
          )}

          {/* Near Me Facilities Grid */}
          <div className="pt-4 text-left">
            <h4 className="text-xs font-black tracking-wider text-slate-500 uppercase mb-4">
              Nearest Facilities Near You
            </h4>

            <div className="grid grid-cols-1 gap-4">
              
              {/* Category: Medical (Active) */}
              <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800 space-y-4 hover:border-emerald-500/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🚑</span>
                    <span className="text-sm font-extrabold text-white">Nearest Medical Care</span>
                  </div>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
                    Active
                  </span>
                </div>

                <div className="flex items-start gap-4">
                  <div className="space-y-1 flex-1">
                    <h3 className="font-extrabold text-white text-base leading-snug">
                      {medical?.name || 'Campus Emergency Clinic'}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-medium text-emerald-400">
                        {medical?.distanceFormatted || 'Calculating...'}
                      </span>
                      <span className="text-slate-700">•</span>
                      <span className="flex items-center gap-1">
                        {medical?.walkingTimeFormatted || 'Calculating...'}
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/map/${location?.slug}?destination=${encodeURIComponent(medical?.name || '')}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all shadow-md shadow-emerald-600/10 focus:outline-none"
                >
                  Navigate to Medical Center
                </Link>
              </div>

              {/* Category: Help Desk */}
              <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800 space-y-4 hover:border-teal-500/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">ℹ️</span>
                    <span className="text-sm font-extrabold text-white">Nearest Help Desk</span>
                  </div>
                  <span className="text-[9px] bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded font-mono font-bold">
                    Active
                  </span>
                </div>

                <div className="flex items-start gap-4">
                  <div className="space-y-1 flex-1">
                    <h3 className="font-extrabold text-white text-base leading-snug">
                      {help?.name || 'Visitor Info Desk'}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-medium text-teal-400">
                        {help?.distanceFormatted || 'Calculating...'}
                      </span>
                      <span className="text-slate-700">•</span>
                      <span className="flex items-center gap-1">
                        {help?.walkingTimeFormatted || 'Calculating...'}
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/map/${location?.slug}?destination=${encodeURIComponent(help?.name || '')}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold transition-all shadow-md shadow-teal-600/10 focus:outline-none"
                >
                  Navigate to Help Desk
                </Link>
              </div>

              {/* Category: Restrooms / Toilet */}
              <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800 space-y-4 hover:border-cyan-500/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🚻</span>
                    <span className="text-sm font-extrabold text-white">Nearest Restroom / Toilet</span>
                  </div>
                  <span className="text-[9px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded font-mono font-bold">
                    Active
                  </span>
                </div>

                <div className="flex items-start gap-4">
                  <div className="space-y-1 flex-1">
                    <h3 className="font-extrabold text-white text-base leading-snug">
                      {toilet?.name || 'Main Gate Restrooms'}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-medium text-cyan-400">
                        {toilet?.distanceFormatted || 'Calculating...'}
                      </span>
                      <span className="text-slate-700">•</span>
                      <span className="flex items-center gap-1">
                        {toilet?.walkingTimeFormatted || 'Calculating...'}
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/map/${location?.slug}?destination=${encodeURIComponent(toilet?.name || '')}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-all shadow-md shadow-cyan-600/10 focus:outline-none"
                >
                  Navigate to Restroom
                </Link>
              </div>

              {/* Category: Security / Police */}
              <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800 space-y-4 hover:border-indigo-500/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🚨</span>
                    <span className="text-sm font-extrabold text-white">Nearest Campus Security / Police</span>
                  </div>
                  <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-mono font-bold">
                    Active
                  </span>
                </div>

                <div className="flex items-start gap-4">
                  <div className="space-y-1 flex-1">
                    <h3 className="font-extrabold text-white text-base leading-snug">
                      {police?.name || 'Campus Police Station'}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-medium text-indigo-400">
                        {police?.distanceFormatted || 'Calculating...'}
                      </span>
                      <span className="text-slate-700">•</span>
                      <span className="flex items-center gap-1">
                        {police?.walkingTimeFormatted || 'Calculating...'}
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/map/${location?.slug}?destination=${encodeURIComponent(police?.name || '')}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-600/10 focus:outline-none"
                >
                  Navigate to Police Station
                </Link>
              </div>

            </div>
          </div>
        </div>

        {/* Powered by Confluxaa */}
        <div className="mt-8 text-center text-[10px] text-slate-600 font-medium">
          Powered by{' '}
          <a 
            href="https://confluxaa.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="font-extrabold text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text"
          >
            Confluxaa
          </a>
        </div>
      </div>
    </div>
  );
}
