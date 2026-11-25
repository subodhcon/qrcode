import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import Loading from '../components/Loading';
import LanguageSelector from '../components/LanguageSelector';
import LostAndFoundModal from '../components/LostAndFoundModal';
import { useTranslation } from '../context/LanguageContext';

export default function PassVerification() {
  const { passId } = useParams();
  const { t, currentLanguage } = useTranslation();

  const [tourist, setTourist] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lostModalOpen, setLostModalOpen] = useState(false);

  useEffect(() => {
    const fetchPass = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/tourists/${encodeURIComponent(passId)}`);
        if (res && res.success && res.data) {
          setTourist(res.data);
          setQrCodeUrl(res.qrCodeDataUrl || '');
        } else {
          setError(t('passNotFoundError') || 'Digital Pass not found or invalid Pass ID.');
        }
      } catch (err) {
        setError(err.message || t('passNotFoundError') || 'Digital Pass not found.');
      } finally {
        setLoading(false);
      }
    };
    if (passId) fetchPass();
  }, [passId, t]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
        <Loading message={currentLanguage === 'hi' ? 'डिजिटल पास सत्यापित हो रहा है...' : 'Verifying Pilgrim Digital Pass...'} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-4 sm:p-6 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-4 relative z-10">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-amber-400 transition-colors py-1.5 px-3 rounded-xl bg-slate-900/80 border border-slate-800"
          >
            <span>←</span>
            <span>{t('backToHome') || 'Home Guide'}</span>
          </Link>
          <LanguageSelector />
        </div>

        {error || !tourist ? (
          <div className="bg-slate-900/90 border border-rose-500/40 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
            <div className="text-4xl">⚠️</div>
            <h1 className="text-lg font-black text-rose-300">
              {currentLanguage === 'hi' ? 'अमान्य या अज्ञात पास ID' : 'Invalid / Unverified Pass'}
            </h1>
            <p className="text-xs text-slate-400">{error}</p>
            <Link
              to="/"
              className="inline-block px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs"
            >
              {t('backToHome') || 'Open Bodh Gaya Guide'}
            </Link>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 relative overflow-hidden">
            {/* Official Header */}
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">☸️</span>
                <div>
                  <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    {t('officialPassHeaderTitle') || 'NAGAR PARISHAD BODH GAYA'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {t('officialPassHeaderSub') || 'Official Digital Pilgrim Pass'}
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase">
                ✓ {tourist.status || 'Active'}
              </span>
            </div>

            {/* Pilgrim Profile */}
            <div className="flex items-center gap-4">
              <div className="w-24 h-28 rounded-2xl bg-slate-800 border-2 border-amber-500/40 overflow-hidden shrink-0 flex items-center justify-center shadow-lg">
                {tourist.photoUrl ? (
                  <img src={tourist.photoUrl} alt={tourist.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">👤</span>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">{t('passIdLabel') || 'Pass ID'}</span>
                  <span className="font-mono font-black text-sm text-amber-400">{tourist.registrationNo}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{t('fullName') || 'Pilgrim Name'}</span>
                  <span className="font-black text-base text-white truncate block">{tourist.fullName}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 font-bold text-[10px]">
                    {tourist.type === 'group'
                      ? `👥 ${t('groupBadge') || 'Group'} (${tourist.totalMembers || 1})`
                      : `👤 ${t('individualBadge') || 'Individual'}`}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 font-bold text-[10px]">
                    🌍 {tourist.country || 'India'}
                  </span>
                </div>
              </div>
            </div>

            {/* Group & Masked Contact Info */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 text-xs space-y-2">
              {tourist.groupName && (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">{t('groupName') || 'Group'}:</span>
                  <span className="font-bold text-indigo-300 text-right">{tourist.groupName}</span>
                </div>
              )}
              {tourist.phone && (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">{t('mobileNumber') || 'Mobile'}:</span>
                  <span className="font-mono text-slate-200">{tourist.countryCode} {tourist.phone}</span>
                </div>
              )}
              {tourist.emergencyContact?.phone && (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">{t('emergencyPhone') || 'Emergency'}:</span>
                  <span className="font-mono text-rose-300">{tourist.emergencyContact.phone}</span>
                </div>
              )}
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                🔒 {currentLanguage === 'hi'
                  ? 'यात्री की गोपनीयता सुरक्षा के लिए संपर्क नंबर आंशिक रूप से छिपाए गए हैं।'
                  : 'Contact details are partially masked for pilgrim privacy.'}
              </div>
            </div>

            {/* 1-Tap Counter Assistance SOS Action */}
            <button
              type="button"
              onClick={() => setLostModalOpen(true)}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white font-black text-xs sm:text-sm shadow-xl shadow-rose-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span className="text-lg animate-pulse">🚨</span>
              <span>
                {currentLanguage === 'hi'
                  ? 'बिछड़े यात्री की सहायता रिपोर्ट दर्ज करें'
                  : 'Report Pilgrim Lost at Help Counter'}
              </span>
            </button>

            {/* Quick Navigation & Helplines */}
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                to="/map"
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-bold text-center"
              >
                🗺️ {t('openMapBtn') || 'Open Map'}
              </Link>
              <a
                href="tel:112"
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold text-center"
              >
                📞 {t('police') || 'Police'}: 112
              </a>
            </div>

            {qrCodeUrl && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                <span>{t('scanForVerification') || 'Official Verified QR Pass'}</span>
                <div className="w-14 h-14 bg-white p-1 rounded-xl shrink-0">
                  <img src={qrCodeUrl} alt="Pass QR" className="w-full h-full object-contain" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pre-filled Lost & Found Counter Modal */}
      <LostAndFoundModal
        isOpen={lostModalOpen}
        onClose={() => setLostModalOpen(false)}
        initialMode="form"
        initialPassId={tourist?.registrationNo || passId || ''}
      />
    </div>
  );
}
