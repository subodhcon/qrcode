import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { MELA_COUNTERS } from '../constants/counters';
import api from '../services/api';

export default function LostAndFoundModal({ isOpen, onClose, initialMode = 'choose' }) {
  const { t, currentLanguage } = useTranslation();
  const navigate = useNavigate();

  // 'choose' = 2 Options View | 'form' = Counter Assistance Form | 'success' = Done
  const [modalMode, setModalMode] = useState(initialMode);

  // Form State
  const [passId, setPassId] = useState('');
  const [isVerifyingPass, setIsVerifyingPass] = useState(false);
  const [passVerifiedData, setPassVerifiedData] = useState(null);
  const [passError, setPassError] = useState(null);
  const [noPassMode, setNoPassMode] = useState(false);

  const [touristName, setTouristName] = useState('');
  const [phone, setPhone] = useState('');
  const [groupName, setGroupName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyName, setEmergencyName] = useState('');

  const [counterNo, setCounterNo] = useState(1);
  const [volunteerName, setVolunteerName] = useState('');
  const [volunteerPhone, setVolunteerPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submittedReport, setSubmittedReport] = useState(null);

  if (!isOpen) return null;

  // Handle Verify Pass ID
  const handleVerifyPass = async () => {
    if (!passId.trim()) return;
    setIsVerifyingPass(true);
    setPassError(null);
    setPassVerifiedData(null);

    try {
      const cleanId = passId.trim().toUpperCase();
      const res = await api.get(`/tourists/${cleanId}`);
      if (res && res.success && res.data) {
        const data = res.data;
        setPassVerifiedData(data);
        setTouristName(data.fullName || '');
        setPhone(data.phone || '');
        setGroupName(data.groupName || '');
        if (data.emergencyContact) {
          setEmergencyPhone(data.emergencyContact.phone || '');
          setEmergencyName(data.emergencyContact.name || '');
        }
      } else {
        setPassError(currentLanguage === 'hi' ? 'पास संख्या नहीं मिली। कृपया पुनः जांचें।' : 'Pass ID not found. You can enter details manually.');
      }
    } catch (err) {
      console.error('Pass verification failed:', err);
      setPassError(currentLanguage === 'hi' ? 'पास नहीं मिला। नीचे मैनुअल विवरण भरें।' : 'Pass not found. Please enter details manually.');
    } finally {
      setIsVerifyingPass(false);
    }
  };

  // Handle Form Submit
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const nameToSubmit = (touristName || passVerifiedData?.fullName || '').trim();
    if (!nameToSubmit) {
      setSubmitError(currentLanguage === 'hi' ? 'कृपया श्रद्धालु का नाम भरें।' : 'Please enter the pilgrim/tourist name.');
      return;
    }

    const selectedCounter = MELA_COUNTERS.find(c => c.id === Number(counterNo)) || MELA_COUNTERS[0];

    setSubmitting(true);
    try {
      const payload = {
        passId: passId.trim().toUpperCase(),
        touristName: nameToSubmit,
        phone: phone.trim() || passVerifiedData?.phone || '',
        countryCode: passVerifiedData?.countryCode || '+91',
        photoUrl: passVerifiedData?.photoUrl || '',
        groupName: groupName.trim() || passVerifiedData?.groupName || '',
        emergencyContactName: emergencyName.trim() || passVerifiedData?.emergencyContact?.name || '',
        emergencyContactPhone: emergencyPhone.trim() || passVerifiedData?.emergencyContact?.phone || '',
        counterNo: selectedCounter.id,
        counterName: selectedCounter.name,
        reportedBy: volunteerName.trim() || 'Counter Staff',
        volunteerPhone: volunteerPhone.trim(),
        notes: notes.trim()
      };

      const res = await api.post('/lost-reports', payload);
      if (res && res.success) {
        setSubmittedReport(res.data);
        setModalMode('success');
      } else {
        setSubmitError(res.message || 'Submission failed');
      }
    } catch (err) {
      console.error('Failed to submit report:', err);
      setSubmitError(err.message || 'Submission failed. Please check internet connection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset and close
  const handleClose = () => {
    setModalMode('choose');
    setPassId('');
    setPassVerifiedData(null);
    setPassError(null);
    setTouristName('');
    setPhone('');
    setGroupName('');
    setEmergencyPhone('');
    setEmergencyName('');
    setNotes('');
    setSubmittedReport(null);
    setSubmitError(null);
    onClose();
  };

  // 1-Click WhatsApp to family / emergency contact
  const handleWhatsAppContact = () => {
    if (!submittedReport) return;
    const targetPhone = (submittedReport.emergencyContact?.phone || submittedReport.phone || '').replace(/[^0-9]/g, '');
    if (!targetPhone) {
      alert(currentLanguage === 'hi' ? 'फोन नंबर उपलब्ध नहीं है।' : 'No phone number available.');
      return;
    }

    const fullPhone = targetPhone.startsWith('91') || targetPhone.length > 10 ? targetPhone : `91${targetPhone}`;
    const message = currentLanguage === 'hi'
      ? `🙏 *नगर परिषद बोधगया — खोया-पाया सहायता कंट्रोल रूम सूचना*\n━━━━━━━━━━━━━━━━━━━━\n👤 *श्रद्धालु का नाम:* ${submittedReport.touristName}\n📍 *सुरक्षित स्थिति:* ${submittedReport.counterName}\n🎫 *पास संख्या:* ${submittedReport.passId || 'N/A'}\n👥 *ग्रुप:* ${submittedReport.groupName || 'तीर्थयात्री दल'}\n\n✅ आपके साथी सहायता काउंटर पर पूरी तरह सुरक्षित हैं। सहायता टीम उन्हें मुख्य मेला कंट्रोल काउंटर पर ला रही है।\n📞 *कंट्रोल रूम हेल्पलाइन:* 112 / 0631-2200735`
      : `🙏 *NAGAR PARISHAD BODH GAYA — LOST & FOUND RESCUE UPDATE*\n━━━━━━━━━━━━━━━━━━━━\n👤 *Pilgrim Name:* ${submittedReport.touristName}\n📍 *Current Safe Location:* ${submittedReport.counterName}\n🎫 *Pass ID:* ${submittedReport.passId || 'N/A'}\n\n✅ Your companion is safe at the help counter. Municipal rescue team is accompanying them to the Central Control Room.\n📞 *Helpline:* 112 / 0631-2200735`;

    window.open(`https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-6">

        {/* ── Modal Header ── */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl sm:text-3xl">🧳</span>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-wide leading-tight">
                {currentLanguage === 'hi' ? 'खोया-पाया केंद्र एवं सहायता' : 'Lost & Found Assistance'}
              </h3>
              <div className="text-[11px] text-indigo-200 font-medium">
                {currentLanguage === 'hi' ? 'नगर परिषद बोधगया • मेला सहायता प्रणाली' : 'Nagar Parishad Bodh Gaya • Mela Help Desk'}
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* ── MODE 1: CHOOSE ACTION (2 OPTIONS) ── */}
        {modalMode === 'choose' && (
          <div className="p-5 sm:p-6 space-y-4">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {currentLanguage === 'hi'
                ? 'कृपया अपनी आवश्यकता अनुसार नीचे दिए गए विकल्पों में से चुनें:'
                : 'Please select what you would like to do:'}
            </p>

            {/* Option 1: View on Map */}
            <div
              onClick={() => {
                handleClose();
                navigate('/map?category=Lost%20and%20Found');
              }}
              className="group p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/60 hover:bg-slate-800/60 transition-all cursor-pointer flex items-center justify-between shadow-md"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                  🗺️
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {currentLanguage === 'hi' ? '1. खोया-पाया केंद्र का नक्शा देखें' : '1. View Lost & Found Centers on Map'}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {currentLanguage === 'hi'
                      ? 'बोधगया के सभी सहायता केंद्र व पुलिस हेल्प डेस्क देखें'
                      : 'Locate help desks, police posts, and luggage claim offices'}
                  </p>
                </div>
              </div>
              <span className="text-indigo-400 font-bold text-sm shrink-0 group-hover:translate-x-1 transition-transform">➔</span>
            </div>

            {/* Option 2: Report Lost Pilgrim at Help Counter */}
            <div
              onClick={() => setModalMode('form')}
              className="group p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 to-slate-950 border border-rose-800/40 hover:border-rose-500/80 hover:bg-rose-950/60 transition-all cursor-pointer flex items-center justify-between shadow-md"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                  🚨
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                      {currentLanguage === 'hi' ? '2. खोया श्रद्धालु सहायता दर्ज करें' : '2. Report Lost Pilgrim at Counter'}
                    </h4>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 animate-pulse">
                      SOS
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {currentLanguage === 'hi'
                      ? 'बिछड़े हुए श्रद्धालु का विवरण व काउंटर संख्या भरकर कंट्रोल रूम को सूचित करें'
                      : 'Enter Pass ID / name and counter number to notify central control room'}
                  </p>
                </div>
              </div>
              <span className="text-rose-400 font-bold text-sm shrink-0 group-hover:translate-x-1 transition-transform">➔</span>
            </div>

            {/* Emergency Hotline Banner */}
            <div className="mt-2 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>{currentLanguage === 'hi' ? '🚨 आपातकालीन सहायता:' : '🚨 24x7 Helplines:'}</span>
              <span className="text-amber-400 font-mono font-bold">पुलिस 112 | कंट्रोल रूम 0631-2200735</span>
            </div>
          </div>
        )}

        {/* ── MODE 2: COUNTER REPORT FORM ── */}
        {modalMode === 'form' && (
          <form onSubmit={handleSubmitReport} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => setModalMode('choose')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer mb-1"
            >
              <span>←</span>
              <span>{currentLanguage === 'hi' ? 'विकल्पों पर वापस जाएं' : 'Back to choices'}</span>
            </button>

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                ⚠️ {submitError}
              </div>
            )}

            {/* Step 1: Pass ID Quick Verification */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <span>🎫</span>
                  <span>{currentLanguage === 'hi' ? 'तीर्थयात्री पास ID (यदि उपलब्ध हो)' : 'Pilgrim Pass ID (If Available)'}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setNoPassMode(!noPassMode)}
                  className="text-[10px] text-slate-400 underline hover:text-white"
                >
                  {noPassMode ? 'पास ID है?' : 'पास नहीं है?'}
                </button>
              </div>

              {!noPassMode && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={passId}
                      onChange={(e) => setPassId(e.target.value.toUpperCase())}
                      placeholder="उदा: BG-2026-0001"
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white font-mono uppercase focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      disabled={isVerifyingPass || !passId.trim()}
                      onClick={handleVerifyPass}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1 shrink-0"
                    >
                      {isVerifyingPass ? (
                        <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>🔍 खोजें</span>
                      )}
                    </button>
                  </div>

                  {passError && (
                    <div className="text-[11px] text-amber-400">
                      ℹ️ {passError}
                    </div>
                  )}

                  {/* Pass Verified Card */}
                  {passVerifiedData && (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center gap-3 animate-fade-in">
                      <div className="w-12 h-14 rounded-lg bg-slate-800 border border-emerald-500/40 overflow-hidden shrink-0 flex items-center justify-center">
                        {passVerifiedData.photoUrl ? (
                          <img src={passVerifiedData.photoUrl} alt="Tourist" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">👤</span>
                        )}
                      </div>
                      <div className="text-xs space-y-0.5 overflow-hidden">
                        <div className="font-bold text-emerald-300 truncate">{passVerifiedData.fullName}</div>
                        <div className="text-[10px] text-slate-300 truncate">
                          👥 {passVerifiedData.groupName || 'Individual Pilgrim'} ({passVerifiedData.country || 'India'})
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          📞 {passVerifiedData.phone} | आपातकालीन: {passVerifiedData.emergencyContact?.phone}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Pilgrim Basic Info */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {currentLanguage === 'hi' ? 'श्रद्धालु का नाम *' : 'Pilgrim Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={touristName}
                  onChange={(e) => setTouristName(e.target.value)}
                  placeholder={currentLanguage === 'hi' ? 'उदा: थोंगचाई / रमेश कुमार' : 'e.g. Ramesh Kumar'}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    {currentLanguage === 'hi' ? 'दल / समूह का नाम' : 'Group Name (if any)'}
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="उदा: बैंकॉक तीर्थयात्री दल"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    {currentLanguage === 'hi' ? 'परिजनों का इमरजेंसी मोबाइल' : 'Family / Guide Mobile'}
                  </label>
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="10-digit WhatsApp number"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Counter Selection */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-indigo-300 mb-1.5 flex items-center gap-1.5">
                  <span>📍</span>
                  <span>{currentLanguage === 'hi' ? 'श्रद्धालु किस सहायता काउंटर पर उपस्थित हैं? *' : 'Reporting Help Counter *'}</span>
                </label>
                <select
                  value={counterNo}
                  onChange={(e) => setCounterNo(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-indigo-500/50 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-400 font-medium"
                >
                  {MELA_COUNTERS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {currentLanguage === 'hi' ? c.hindiName : c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {currentLanguage === 'hi' ? 'काउंटर कर्मी का नाम' : 'Volunteer / Staff Name'}
                  </label>
                  <input
                    type="text"
                    value={volunteerName}
                    onChange={(e) => setVolunteerName(e.target.value)}
                    placeholder="उदा: राजेश कुमार (वॉलंटियर)"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {currentLanguage === 'hi' ? 'काउंटर फोन नंबर' : 'Counter Contact Number'}
                  </label>
                  <input
                    type="tel"
                    value={volunteerPhone}
                    onChange={(e) => setVolunteerPhone(e.target.value)}
                    placeholder="उदा: 9876543210"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Step 4: Notes / Situation */}
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                {currentLanguage === 'hi' ? 'टिप्पणी / स्थिति विवरण' : 'Situation Notes'}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={currentLanguage === 'hi' ? 'उदा: बुजुर्ग श्रद्धालु हैं, कालचक्र मैदान के पास मुख्य दल से बिछड़ गए हैं। काउंटर पर सुरक्षित बैठे हैं।' : 'e.g. Elderly person, separated near temple gate.'}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Form Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalMode('choose')}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                {t('cancel')}
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white font-black text-xs sm:text-sm shadow-xl shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{currentLanguage === 'hi' ? 'कंट्रोल रूम को भेज रहे हैं...' : 'Submitting Alert...'}</span>
                  </>
                ) : (
                  <>
                    <span>🚨</span>
                    <span>{currentLanguage === 'hi' ? 'कंट्रोल रूम को सूचित करें' : 'Send Alert to Control Room'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ── MODE 3: SUCCESS CONFIRMATION ── */}
        {modalMode === 'success' && submittedReport && (
          <div className="p-6 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-3xl mx-auto animate-bounce">
              ✓
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-black text-white">
                {currentLanguage === 'hi' ? 'सहायता अलर्ट सफलतापूर्वक दर्ज!' : 'Lost Pilgrim Alert Logged!'}
              </h4>
              <p className="text-xs text-emerald-400 font-bold">
                {currentLanguage === 'hi'
                  ? 'सुपरएडमिन / सेंट्रल कंट्रोल रूम को तत्काल सूचना भेज दी गई है।'
                  : 'Superadmin & Central Control Room have received immediate notification.'}
              </p>
            </div>

            {/* Report Receipt Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left text-xs space-y-2">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Report ID:</span>
                <span className="font-mono font-bold text-amber-400">{submittedReport.reportId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{currentLanguage === 'hi' ? 'श्रद्धालु का नाम:' : 'Pilgrim:'}</span>
                <span className="font-bold text-white">{submittedReport.touristName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{currentLanguage === 'hi' ? 'उपस्थिति काउंटर:' : 'Help Counter:'}</span>
                <span className="font-bold text-indigo-300">{submittedReport.counterName}</span>
              </div>
              {submittedReport.groupName && (
                <div className="flex justify-between">
                  <span className="text-slate-400">{currentLanguage === 'hi' ? 'दल / ग्रुप:' : 'Group:'}</span>
                  <span className="text-slate-200">{submittedReport.groupName}</span>
                </div>
              )}
            </div>

            {/* Action Buttons: WhatsApp to family & Finish */}
            <div className="space-y-2.5">
              {(submittedReport.emergencyContact?.phone || submittedReport.phone) && (
                <button
                  type="button"
                  onClick={handleWhatsAppContact}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  <span>📲</span>
                  <span>{currentLanguage === 'hi' ? 'परिजनों / टूर गाइड को WhatsApp भेजें' : 'Send WhatsApp to Family/Guide'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
              >
                {currentLanguage === 'hi' ? 'समाप्त करें (Close)' : 'Done'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
