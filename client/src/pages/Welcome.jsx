import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import api from '../services/api';

export default function Welcome() {
  const [sosActive, setSosActive] = useState(false);
  const [guidelinesActive, setGuidelinesActive] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const { t } = useTranslation();

  const [slides, setSlides] = useState(['advisoryQueue', 'advisoryCleanliness', 'advisorySecurity']);

  // Feedback States
  const [feedbackActive, setFeedbackActive] = useState(false);
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
    <div className="max-w-md mx-auto min-h-[90vh] flex flex-col justify-between py-6 px-4 animate-fade-in text-white">
      
      {/* ── SOS Modal Overlay (Mockup Design) ── */}
      {sosActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in">
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

      {/* ── Feedback Modal ── */}
      {feedbackActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in text-slate-800">
          <div className="w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl bg-white p-5 border border-slate-100 relative">
            {/* Header: Title & Close Button */}
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-extrabold text-[#1e293b] tracking-tight font-sans">
                {t('feedbackTitle')}
              </h3>
              <button
                onClick={() => {
                  setFeedbackActive(false);
                  setFeedbackSuccessMsg('');
                  setFeedbackErrorMsg('');
                  setFeedbackForm({ name: '', phone: '', category: 'Suggestion', message: '', locationContext: 'Welcome Page Scan' });
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

      {/* ── Top Header (Badge & Language Selector) ── */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {t('badge')}
        </div>
        <LanguageSelector />
      </div>

      {/* ── Welcome Heading Section ── */}
      <div className="text-center space-y-3 pt-4">
        <h1 className="text-3xl font-black text-transparent bg-gradient-to-b from-white to-slate-300 bg-clip-text leading-tight pt-1">
          {t('welcomeTitle')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
          {t('welcomeSubtitle')}
        </p>
      </div>

      {/* ── Center Section (Primary Action) ── */}
      <div className="my-6 space-y-4">
        {/* Main Interactive Map Card */}
        <div 
          className="rounded-3xl p-6 sm:p-8 relative overflow-hidden group transition-all duration-300 hover:border-emerald-500/30"
          style={{
            background: 'linear-gradient(160deg, #0b1329 0%, #030712 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 25px 60px -15px rgba(0,0,0,0.8), 0 0 50px -10px rgba(16,185,129,0.04)'
          }}
        >
          {/* Accent glow on hover */}
          <div className="absolute -top-16 -right-16 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none transition-all duration-300 group-hover:scale-125" />
          
          <div className="relative space-y-5 text-left">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 8px 24px rgba(16,185,129,0.3)' }}>
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">{t('mapCardTitle')}</h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
                {t('mapCardDesc')}
              </p>
            </div>

            <Link
              to="/map"
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl text-sm font-bold text-white transition-all duration-200 active:scale-[0.98] cursor-pointer hover:opacity-95"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 8px 24px rgba(16,185,129,0.25)'
              }}
            >
              {t('openMapBtn')}
            </Link>
          </div>
        </div>

        {/* Emergency SOS Quick Launch */}
        <button
          onClick={() => setSosActive(true)}
          className="w-full py-3.5 px-5 rounded-2xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer animate-pulse"
        >
          <div className="flex items-center gap-2">
            <span>🚨</span>
            <span>{t('sosBtn')}</span>
          </div>
          <span className="text-xs">{t('start')} →</span>
        </button>

        {/* Feedback Quick Launch */}
        <button
          onClick={() => setFeedbackActive(true)}
          className="w-full py-3.5 px-5 rounded-2xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span>📝</span>
            <span>{t('feedbackBtn')}</span>
          </div>
          <span className="text-xs">{t('start')} →</span>
        </button>

        {/* Official Advisories Block */}
        <div className="rounded-2xl p-4 bg-slate-950/60 border border-amber-500/20 shadow-lg text-left space-y-3 relative overflow-hidden">
          {/* Top Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span>📢 {t('advisoriesTitle')}</span>
            </div>
            <button
              onClick={() => setGuidelinesActive(true)}
              className="text-[9px] font-extrabold uppercase tracking-wider text-amber-400/80 hover:text-amber-300 transition-colors bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md cursor-pointer"
            >
              {t('viewAllBtn')}
            </button>
          </div>
          
          {/* Sliding Advisory text */}
          <div className="min-h-[40px] flex items-center">
            <p className="text-[10px] sm:text-xs text-slate-300 leading-relaxed animate-fade-in font-medium transition-all duration-300">
              {slides[activeSlide]?.startsWith('advisory') ? t(slides[activeSlide]) : slides[activeSlide]}
            </p>
          </div>
        </div>
      </div>

      {/* ── Bottom Section (Footer) ── */}
      <div className="text-center space-y-3 pt-3 border-t border-slate-900/60">
        <p className="text-[10px] text-slate-500 leading-relaxed max-w-xs mx-auto">
          {t('authorizedBy')}
        </p>
        <div className="text-[10px] text-slate-700 font-medium">
          Powered by{' '}
          <a href="https://confluxaa.com" target="_blank" rel="noopener noreferrer"
            className="font-extrabold text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text hover:opacity-80 transition-opacity">
            Confluxaa
          </a>
        </div>
      </div>

      {/* ── Guidelines Modal/Drawer ── */}
      {guidelinesActive && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl transition-all duration-300" style={{
            background: 'linear-gradient(160deg, #0b1329 0%, #030712 100%)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
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

              <div className="space-y-2 pt-2 border-t border-slate-900">
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
                  className="w-full py-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-white hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
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
