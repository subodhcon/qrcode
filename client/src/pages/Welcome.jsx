import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import api from '../services/api';

export default function Welcome() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Modals & Drawer State
  const [sosActive, setSosActive] = useState(false);
  const [guidelinesActive, setGuidelinesActive] = useState(false);
  const [feedbackActive, setFeedbackActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Location / GPS State
  const [locating, setLocating] = useState(false);
  const [userCoords, setUserCoords] = useState(null);

  // Advisory Slider State
  const [activeSlide, setActiveSlide] = useState(0);
  const [slides, setSlides] = useState(['advisoryQueue', 'advisoryCleanliness', 'advisorySecurity']);

  // Feedback Form State
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = useState('');
  const [feedbackErrorMsg, setFeedbackErrorMsg] = useState('');
  const [feedbackForm, setFeedbackForm] = useState({
    name: '',
    phone: '',
    category: 'Suggestion',
    message: '',
    locationContext: 'Welcome Page Scan'
  });

  useEffect(() => {
    const fetchCustomAnnouncement = async () => {
      try {
        const response = await api.get('/announcement');
        if (response && response.success && response.data && response.data.text) {
          setSlides([response.data.text, 'advisoryQueue', 'advisoryCleanliness', 'advisorySecurity']);
        }
      } catch (err) {
        console.error('Failed to load custom announcement', err);
      }
    };
    fetchCustomAnnouncement();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/map?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/map');
    }
  };

  const handleWhereAmI = () => {
    setLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocating(false);
          const { latitude, longitude } = position.coords;
          setUserCoords({ latitude, longitude });
          navigate(`/map?lat=${latitude}&lng=${longitude}&locate=true`);
        },
        (error) => {
          setLocating(false);
          console.warn('Geolocation warning:', error);
          navigate('/map?locate=true');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setLocating(false);
      navigate('/map?locate=true');
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFeedbackSubmitting(true);
    setFeedbackErrorMsg('');
    setFeedbackSuccessMsg('');
    try {
      const response = await api.post('/feedback', feedbackForm);
      if (response && response.data) {
        setFeedbackSuccessMsg(t('feedbackSuccess'));
        setFeedbackForm({
          name: '',
          phone: '',
          category: 'Suggestion',
          message: '',
          locationContext: 'Welcome Page Scan'
        });
      } else {
        setFeedbackErrorMsg(response.message || t('feedbackError'));
      }
    } catch (err) {
      setFeedbackErrorMsg(err.message || t('feedbackError'));
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-white flex flex-col items-center justify-between overflow-x-hidden font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* ── Background Image & Dark Overlay ── */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 pointer-events-none opacity-85 scale-105"
        style={{ backgroundImage: `url('/gaya_hero.png')` }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-slate-950/45 via-slate-950/55 to-slate-950/85 pointer-events-none" />

      {/* ── Main Mobile View Container ── */}
      <div className="relative z-10 w-full max-w-md min-h-screen px-4 py-4 flex flex-col justify-between space-y-5">

        {/* ── Top Header Navigation ── */}
        <header className="relative z-30 flex items-center justify-between pt-2">
          {/* Hamburger Menu Toggle Button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="w-10 h-10 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/50 flex items-center justify-center text-slate-200 transition-all active:scale-95 cursor-pointer backdrop-blur-md shadow-lg"
            aria-label="Open Navigation Menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Right Language Selector */}
          <div className="relative z-40 backdrop-blur-md bg-slate-900/80 rounded-2xl p-0.5 border border-slate-700/50 shadow-lg">
            <LanguageSelector />
          </div>
        </header>

        {/* ── Hero Title Section ── */}
        <section className="text-left space-y-1.5 pt-2">
          <p className="text-sm font-medium text-slate-300 tracking-wide">
            {t('welcomeTitle') || "Welcome to"}
          </p>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">
            {t('welcomeCity') || "Gaya Ji"}
          </h1>
          <h2 className="text-lg font-bold text-amber-400/95 tracking-wide">
            {t('welcomeSubHeader') || "Pitru Paksha Mela 2026"}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed pt-1 max-w-xs font-normal">
            {t('welcomeTagline') || "Your Digital Guide for a Safe & Convenient Visit"}
          </p>
        </section>

        {/* ── Search Bar Input ── */}
        <section>
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlacesServices') || "Search for places, services..."}
              className="w-full py-3.5 pl-4 pr-12 rounded-2xl bg-white text-slate-900 text-sm font-medium placeholder-slate-400 shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
              aria-label="Search"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>
        </section>

        {/* ── Where Am I? Feature Card ── */}
        <section>
          <div
            onClick={handleWhereAmI}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-[#0a2540] via-[#0d345a] to-[#0f3d6b] border border-blue-500/40 shadow-2xl flex items-center justify-between cursor-pointer hover:border-blue-400 transition-all active:scale-[0.99] group relative overflow-hidden"
          >
            {/* Glow Accent */}
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-blue-500/20 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-all" />

            <div className="flex items-center gap-3.5 relative z-10">
              <div className="w-11 h-11 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/40 text-white shrink-0 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              <div className="text-left space-y-0.5">
                <h3 className="text-base font-bold text-white leading-tight">
                  {locating ? t('loadingLocation') || "Detecting GPS..." : t('whereAmI') || "Where Am I?"}
                </h3>
                <p className="text-xs text-blue-200/80 font-medium">
                  {t('findCurrentLocation') || "Find my current location"}
                </p>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:translate-x-1 transition-transform shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </section>

        {/* ── Quick Access Grid (8 Feature Icons) ── */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-white text-left tracking-tight">
            {t('quickAccess') || "Quick Access"}
          </h3>

          <div className="grid grid-cols-4 gap-2.5">
            
            {/* 1. Nearby Places */}
            <Link
              to="/map?category=All"
              className="flex flex-col items-center justify-center text-center group cursor-pointer"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 group-hover:scale-105 active:scale-95 transition-all mb-1.5">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H7m4 0v4m0 0h4m-4 0H7" />
                </svg>
              </div>
              <span className="text-[11px] font-bold text-slate-200 leading-tight group-hover:text-white transition-colors">
                {t('nearbyPlaces') || "Nearby Places"}
              </span>
            </Link>

            {/* 2. Emergency Services */}
            <button
              onClick={() => setSosActive(true)}
              className="flex flex-col items-center justify-center text-center group cursor-pointer"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30 group-hover:scale-105 active:scale-95 transition-all mb-1.5">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-[11px] font-bold text-slate-200 leading-tight group-hover:text-white transition-colors">
                {t('emergencyServicesTitle') || "Emergency Services"}
              </span>
            </button>

            {/* 3. Temples & Ghats */}
            <Link
              to="/map?category=Temple"
              className="flex flex-col items-center justify-center text-center group cursor-pointer"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30 group-hover:scale-105 active:scale-95 transition-all mb-1.5">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
              </div>
              <span className="text-[11px] font-bold text-slate-200 leading-tight group-hover:text-white transition-colors">
                {t('templesGhats') || "Temples & Ghats"}
              </span>
            </Link>

            {/* 4. Map & Navigation */}
            <Link
              to="/map"
              className="flex flex-col items-center justify-center text-center group cursor-pointer"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 group-hover:scale-105 active:scale-95 transition-all mb-1.5">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <span className="text-[11px] font-bold text-slate-200 leading-tight group-hover:text-white transition-colors">
                {t('mapNav') || "Map & Navigation"}
              </span>
            </Link>

            {/* 5. Facilities */}
            <Link
              to="/map?category=Toilet"
              className="flex flex-col items-center justify-center text-center group cursor-pointer"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 group-hover:scale-105 active:scale-95 transition-all mb-1.5">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <span className="text-[11px] font-bold text-slate-200 leading-tight group-hover:text-white transition-colors">
                {t('facilities') || "Facilities"}
              </span>
            </Link>

            {/* 6. Transport */}
            <Link
              to="/map?category=Parking"
              className="flex flex-col items-center justify-center text-center group cursor-pointer"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 group-hover:scale-105 active:scale-95 transition-all mb-1.5">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8m-8 4h8m-6 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                </svg>
              </div>
              <span className="text-[11px] font-bold text-slate-200 leading-tight group-hover:text-white transition-colors">
                {t('transport') || "Transport"}
              </span>
            </Link>

            {/* 7. Event Info */}
            <button
              onClick={() => setGuidelinesActive(true)}
              className="flex flex-col items-center justify-center text-center group cursor-pointer"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30 group-hover:scale-105 active:scale-95 transition-all mb-1.5">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-[11px] font-bold text-slate-200 leading-tight group-hover:text-white transition-colors">
                {t('eventInfo') || "Event Info"}
              </span>
            </button>

            {/* 8. Lost & Found */}
            <button
              onClick={() => setFeedbackActive(true)}
              className="flex flex-col items-center justify-center text-center group cursor-pointer"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-pink-600/30 group-hover:scale-105 active:scale-95 transition-all mb-1.5">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <span className="text-[11px] font-bold text-slate-200 leading-tight group-hover:text-white transition-colors">
                {t('lostFound') || "Lost & Found"}
              </span>
            </button>

          </div>
        </section>

        {/* ── Official Advisories Ticker Block ── */}
        <section>
          <div className="rounded-2xl p-3.5 bg-slate-900/80 border border-amber-500/20 shadow-xl text-left space-y-1.5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span>📢 {t('advisoriesTitle')}</span>
              </div>
              <button
                onClick={() => setGuidelinesActive(true)}
                className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-colors bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md cursor-pointer"
              >
                {t('viewAllBtn')}
              </button>
            </div>
            
            <div className="min-h-[36px] flex items-center">
              <p className="text-xs text-slate-300 leading-relaxed font-medium transition-all">
                {slides[activeSlide]?.startsWith('advisory') ? t(slides[activeSlide]) : slides[activeSlide]}
              </p>
            </div>
          </div>
        </section>

        {/* ── Emergency Helpline Banner (Bottom Action Card) ── */}
        <section className="pt-1">
          <div className="w-full p-2 rounded-2xl bg-gradient-to-r from-red-50/95 via-rose-50/95 to-red-100/90 text-slate-900 border border-red-300/80 shadow-2xl flex items-center justify-between gap-1 sm:gap-2">
            
            {/* Left Emergency Help Call Button & Label */}
            <button
              onClick={() => setSosActive(true)}
              className="flex items-center gap-1.5 text-left cursor-pointer group shrink-0"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/40 group-hover:scale-105 transition-transform shrink-0">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1.003 1.003 0 011.02-.24c1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
              </div>
              <div className="space-y-0">
                <h4 className="text-[11px] sm:text-xs font-black text-red-800 leading-tight">
                  {t('emergencyServicesTitle') || "Emergency Help"}
                </h4>
                <p className="text-[9px] font-semibold text-slate-600 whitespace-nowrap">
                  {t('oneTapToCall') || "One Tap to Call"}
                </p>
              </div>
            </button>

            {/* Vertical Divider Line */}
            <div className="w-px h-7 bg-red-200/90 shrink-0" />

            {/* Quick Dial Numbers Row */}
            <div className="flex items-center justify-between gap-1 sm:gap-2 flex-1 min-w-0">
              {/* Police 100 */}
              <a
                href="tel:100"
                className="flex items-center gap-0.5 hover:opacity-80 transition-opacity text-left shrink-0"
              >
                <span className="text-[11px] sm:text-xs">🛡️</span>
                <div className="leading-none">
                  <p className="text-[7px] sm:text-[8px] font-bold text-slate-600">Police</p>
                  <p className="text-[9px] sm:text-[11px] font-black text-slate-900">100</p>
                </div>
              </a>

              {/* Ambulance 102 */}
              <a
                href="tel:102"
                className="flex items-center gap-0.5 hover:opacity-80 transition-opacity text-left shrink-0"
              >
                <span className="text-[11px] sm:text-xs">🚑</span>
                <div className="leading-none">
                  <p className="text-[7px] sm:text-[8px] font-bold text-slate-600">Ambulance</p>
                  <p className="text-[9px] sm:text-[11px] font-black text-slate-900">102</p>
                </div>
              </a>

              {/* Fire 101 */}
              <a
                href="tel:101"
                className="flex items-center gap-0.5 hover:opacity-80 transition-opacity text-left shrink-0"
              >
                <span className="text-[11px] sm:text-xs">🔥</span>
                <div className="leading-none">
                  <p className="text-[7px] sm:text-[8px] font-bold text-slate-600">Fire</p>
                  <p className="text-[9px] sm:text-[11px] font-black text-slate-900">101</p>
                </div>
              </a>

              {/* Women Helpline 181 */}
              <a
                href="tel:181"
                className="flex items-center gap-0.5 hover:opacity-80 transition-opacity text-left shrink-0"
              >
                <span className="text-[11px] sm:text-xs">👩</span>
                <div className="leading-none">
                  <p className="text-[7px] sm:text-[8px] font-bold text-slate-600">Women</p>
                  <p className="text-[9px] sm:text-[11px] font-black text-slate-900">181</p>
                </div>
              </a>
            </div>

            {/* Far Right Arrow Chevron */}
            <button
              onClick={() => setSosActive(true)}
              className="text-red-600 hover:text-red-800 transition-colors p-0.5 cursor-pointer shrink-0"
              aria-label="View all emergency numbers"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="text-center space-y-1.5 pt-2 pb-1 border-t border-slate-800/60">
          <p className="text-[10px] text-slate-400 leading-relaxed max-w-xs mx-auto">
            {t('authorizedBy')}
          </p>
          <div className="text-[10px] text-slate-500 font-medium">
            Powered by{' '}
            <a 
              href="https://confluxaa.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-extrabold text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text hover:opacity-80 transition-opacity"
            >
              Confluxaa
            </a>
          </div>
        </footer>

      </div>

      {/* ── Side Drawer Menu Overlay ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex animate-fade-in">
          {/* Backdrop */}
          <div 
            onClick={() => setMenuOpen(false)} 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
          />

          {/* Side Drawer Content */}
          <div className="relative z-10 w-4/5 max-w-xs h-full bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between text-left shadow-2xl">
            <div className="space-y-6">
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="space-y-0.5">
                  <h3 className="text-base font-black text-white">{t('welcomeCity') || "Gaya Ji"} Guide</h3>
                  <p className="text-[10px] text-slate-400">{t('welcomeSubHeader') || "Pitru Paksha Mela 2026"}</p>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-2 text-sm font-bold">
                <Link
                  to="/map"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition-colors"
                >
                  <span>🗺️</span>
                  <span>{t('mapNav') || "Interactive Map"}</span>
                </Link>

                <button
                  onClick={() => { setMenuOpen(false); setSosActive(true); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-red-400 hover:text-red-300 transition-colors text-left cursor-pointer"
                >
                  <span>🚨</span>
                  <span>{t('emergencyServicesTitle') || "Emergency Helpline"}</span>
                </button>

                <button
                  onClick={() => { setMenuOpen(false); setGuidelinesActive(true); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-amber-400 hover:text-amber-300 transition-colors text-left cursor-pointer"
                >
                  <span>📢</span>
                  <span>{t('advisoriesTitle') || "Official Advisories"}</span>
                </button>

                <button
                  onClick={() => { setMenuOpen(false); setFeedbackActive(true); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 transition-colors text-left cursor-pointer"
                >
                  <span>📝</span>
                  <span>{t('feedbackBtn') || "Feedback & Support"}</span>
                </button>

                <a
                  href="http://www.pinddaangaya.bihar.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <span>🏛️</span>
                  <span>{t('officialWebsiteBtn') || "Government Portal"}</span>
                </a>
              </nav>
            </div>

            {/* Admin Login Link */}
            <div className="pt-4 border-t border-slate-800">
              <Link
                to="/admin/login"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
              >
                <span>🔐</span>
                <span>Admin Login</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── SOS Modal Overlay ── */}
      {sosActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl bg-white p-5 border border-slate-100 relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-extrabold text-[#1e293b] tracking-tight font-sans">
                {t('oneTapToCall') || "One Tap Call"}
              </h3>
              <button
                onClick={() => setSosActive(false)}
                className="w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-0.5 max-h-[340px] overflow-y-auto no-scrollbar pr-0.5 text-left">
              <a href="tel:100" className="flex justify-between items-center py-3 border-b border-[#f1f5f9] text-decoration-none group">
                <span className="text-xs font-bold text-[#1e293b] group-hover:text-red-500 transition-colors font-sans">Police Control Room</span>
                <div className="w-8 h-8 rounded-full border border-[#fca5a5]/30 bg-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-all"><span className="text-[#ef4444] text-xs">📞</span></div>
              </a>
              <a href="tel:102" className="flex justify-between items-center py-3 border-b border-[#f1f5f9] text-decoration-none group">
                <span className="text-xs font-bold text-[#1e293b] group-hover:text-red-500 transition-colors font-sans">Ambulance Service</span>
                <div className="w-8 h-8 rounded-full border border-[#fca5a5]/30 bg-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-all"><span className="text-[#ef4444] text-xs">📞</span></div>
              </a>
              <a href="tel:101" className="flex justify-between items-center py-3 border-b border-[#f1f5f9] text-decoration-none group">
                <span className="text-xs font-bold text-[#1e293b] group-hover:text-red-500 transition-colors font-sans">Fire Brigade</span>
                <div className="w-8 h-8 rounded-full border border-[#fca5a5]/30 bg-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-all"><span className="text-[#ef4444] text-xs">📞</span></div>
              </a>
              <a href="tel:1091" className="flex justify-between items-center py-3 border-b border-[#f1f5f9] text-decoration-none group">
                <span className="text-xs font-bold text-[#1e293b] group-hover:text-red-500 transition-colors font-sans">Women Helpline</span>
                <div className="w-8 h-8 rounded-full border border-[#fca5a5]/30 bg-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-all"><span className="text-[#ef4444] text-xs">📞</span></div>
              </a>
              <a href="tel:1098" className="flex justify-between items-center py-3 border-b border-[#f1f5f9] text-decoration-none group">
                <span className="text-xs font-bold text-[#1e293b] group-hover:text-red-500 transition-colors font-sans">Child Helpline</span>
                <div className="w-8 h-8 rounded-full border border-[#fca5a5]/30 bg-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-all"><span className="text-[#ef4444] text-xs">📞</span></div>
              </a>
              <a href="tel:1070" className="flex justify-between items-center py-3 border-b border-[#f1f5f9] text-decoration-none group">
                <span className="text-xs font-bold text-[#1e293b] group-hover:text-red-500 transition-colors font-sans">Disaster Management</span>
                <div className="w-8 h-8 rounded-full border border-[#fca5a5]/30 bg-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-all"><span className="text-[#ef4444] text-xs">📞</span></div>
              </a>
              <a href="tel:112" className="flex justify-between items-center py-3 text-decoration-none group">
                <span className="text-xs font-bold text-[#1e293b] group-hover:text-red-500 transition-colors font-sans">Medical Emergency (112)</span>
                <div className="w-8 h-8 rounded-full border border-[#fca5a5]/30 bg-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-all"><span className="text-[#ef4444] text-xs">📞</span></div>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Feedback Modal ── */}
      {feedbackActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in text-slate-800">
          <div className="w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl bg-white p-5 border border-slate-100 relative">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-extrabold text-[#1e293b] tracking-tight font-sans">
                {t('feedbackTitle')}
              </h3>
              <button
                onClick={() => {
                  setFeedbackActive(false);
                  setFeedbackSuccessMsg('');
                  setFeedbackErrorMsg('');
                }}
                className="w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed text-left">
              {t('feedbackSubtitle')}
            </p>

            {feedbackSuccessMsg ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto text-xl">✅</div>
                <p className="text-xs font-bold text-slate-800">{feedbackSuccessMsg}</p>
                <button
                  onClick={() => {
                    setFeedbackActive(false);
                    setFeedbackSuccessMsg('');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition-colors cursor-pointer"
                >
                  {t('close')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-3 text-left">
                {feedbackErrorMsg && (
                  <p className="text-[10px] text-red-500 font-bold bg-red-50 p-2 rounded-lg border border-red-100">{feedbackErrorMsg}</p>
                )}

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">{t('nameLabel')}</label>
                  <input
                    type="text"
                    value={feedbackForm.name}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 font-sans"
                    placeholder="e.g. Subodh Kumar"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">{t('phoneLabel')}</label>
                  <input
                    type="tel"
                    value={feedbackForm.phone}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 font-sans"
                    placeholder="e.g. +91 9999999999"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">{t('categoryLabel')}</label>
                  <select
                    value={feedbackForm.category}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 font-sans bg-white"
                  >
                    <option value="Incorrect Info">{t('categoryIncorrectInfo')}</option>
                    <option value="Damaged Signboard">{t('categoryDamagedSign')}</option>
                    <option value="Suggestion">{t('categorySuggestion')}</option>
                    <option value="Other">{t('categoryOther')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">{t('messageLabel')}</label>
                  <textarea
                    value={feedbackForm.message}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
                    required
                    rows="3"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 font-sans resize-none"
                    placeholder="Describe the issue or suggestion..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={feedbackSubmitting}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {feedbackSubmitting ? t('submitting') : t('submitFeedback')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Guidelines Modal/Drawer ── */}
      {guidelinesActive && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 bg-slate-900 border border-slate-800">
            <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-300" />
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white">{t('guidelinesModalTitle')}</h3>
                <button onClick={() => setGuidelinesActive(false)} className="text-slate-400 hover:text-white transition-colors text-sm font-bold cursor-pointer">✕</button>
              </div>
              
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 text-left">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <span>🚶</span> {t('advisoriesTitle')}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {t('advisoryQueue')}
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <span>🧹</span> Cleanliness Guidelines
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {t('advisoryCleanliness')}
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                    <span>🛡️</span> Security & Safety
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {t('advisorySecurity')}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <a
                  href="http://www.pinddaangaya.bihar.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  🏛️ {t('officialWebsiteBtn')}
                </a>

                <button
                  onClick={() => setGuidelinesActive(false)}
                  className="w-full py-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  {t('dismiss')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
