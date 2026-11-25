import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { MELA_COUNTERS } from '../constants/counters';
import api from '../services/api';

export default function LostReportsDesk() {
  const { t, currentLanguage } = useTranslation();

  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, reunited: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [counterFilter, setCounterFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Action Modals & State
  const [selectedReport, setSelectedReport] = useState(null);
  const [rescuerName, setRescuerName] = useState('');
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Reports
  const fetchReports = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (counterFilter) params.append('counterNo', counterFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await api.get(`/lost-reports?${params.toString()}`);
      if (res && res.success) {
        setReports(res.data || []);
        if (res.stats) {
          setStats(res.stats);
        }
      }
      setError(null);
    } catch (err) {
      console.error('Failed to load lost reports:', err);
      setError(err.message || 'Failed to fetch lost reports');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, counterFilter, searchQuery]);

  useEffect(() => {
    fetchReports();
    // Auto refresh every 15 seconds for live control room monitoring
    const timer = setInterval(() => {
      fetchReports();
    }, 15000);
    return () => clearInterval(timer);
  }, [fetchReports]);

  // Update Status
  const handleUpdateStatus = async (reportId, newStatus, rescuer = '') => {
    setActionLoading(true);
    try {
      const res = await api.put(`/lost-reports/${reportId}/status`, {
        status: newStatus,
        assignedRescuer: rescuer
      });

      if (res && res.success) {
        showToast(
          currentLanguage === 'hi'
            ? `✓ रिपोर्ट स्थिति '${newStatus}' में अपडेट कर दी गई!`
            : `✓ Status updated to ${newStatus}!`
        );
        setIsDispatchModalOpen(false);
        setSelectedReport(null);
        setRescuerName('');
        fetchReports();
      }
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Report
  const handleDeleteReport = async (reportId, repCode) => {
    if (!window.confirm(`Are you sure you want to delete incident ${repCode}?`)) return;
    try {
      await api.delete(`/lost-reports/${reportId}`);
      showToast(`✓ Incident ${repCode} deleted.`);
      fetchReports();
    } catch (err) {
      alert(err.message || 'Failed to delete report');
    }
  };

  // Open WhatsApp to notify family / group leader
  const handleWhatsAppFamily = (report) => {
    const rawPhone = (report.emergencyContact?.phone || report.phone || '').replace(/[^0-9]/g, '');
    if (!rawPhone) {
      alert(currentLanguage === 'hi' ? 'फोन नंबर उपलब्ध नहीं है।' : 'No phone number available.');
      return;
    }

    const fullPhone = rawPhone.startsWith('91') || rawPhone.length > 10 ? rawPhone : `91${rawPhone}`;
    const text = currentLanguage === 'hi'
      ? `🙏 *नगर परिषद बोधगया — खोया-पाया नियंत्रण कक्ष सूचना*\n━━━━━━━━━━━━━━━━━━━━\n👤 *श्रद्धालु का नाम:* ${report.touristName}\n🎫 *पास ID:* ${report.passId || 'N/A'}\n📍 *वर्तमान स्थान:* ${report.counterName}\n👥 *समूह:* ${report.groupName || 'तीर्थयात्री'}\n\n✅ *शुभ सूचना:* आपके साथी उक्त सहायता काउंटर पर पूरी तरह सुरक्षित हैं। नगर परिषद की बचाव टीम उन्हें मुख्य नियंत्रण कक्ष ला रही है।\n📞 *कंट्रोल रूम संपर्क:* 112 / 0631-2200735\n🌸 *प्रशासन — नगर परिषद बोधगया*`
      : `🙏 *NAGAR PARISHAD BODH GAYA — RESCUE CONTROL ROOM UPDATE*\n━━━━━━━━━━━━━━━━━━━━\n👤 *Pilgrim Name:* ${report.touristName}\n🎫 *Pass ID:* ${report.passId || 'N/A'}\n📍 *Current Safe Location:* ${report.counterName}\n👥 *Group:* ${report.groupName || 'Pilgrims'}\n\n✅ *Status:* Your companion is safe at the help counter. Rescue marshals are bringing them to the Central Control Room.\n📞 *Helplines:* 112 / 0631-2200735\n🏛️ *Administration — Nagar Parishad Bodh Gaya*`;

    window.open(`https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in text-white">

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-bold animate-bounce border border-emerald-400">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Top Header & Live Counter Stats ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚨</span>
            <h2 className="text-lg sm:text-xl font-black tracking-wide text-white">
              {currentLanguage === 'hi' ? 'खोया-पाया त्वरित नियंत्रण कक्ष' : 'Lost & Found SOS Control Room'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30 animate-pulse">
              LIVE 15s
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {currentLanguage === 'hi'
              ? 'मेला के 10 सहायता काउंटरों से बिछड़े तीर्थयात्रियों की रियल-टाइम रिपोर्ट और बचाव'
              : 'Real-time incident response from 10 mela help counters across Bodh Gaya'}
          </p>
        </div>

        <button
          onClick={fetchReports}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
        >
          <span>🔄</span>
          <span>{currentLanguage === 'hi' ? 'रिफ्रेश करें' : 'Refresh'}</span>
        </button>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/60 via-slate-900 to-slate-950 border border-rose-800/40 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
              {currentLanguage === 'hi' ? 'सक्रिय केस (कार्रवाई जरूरी)' : 'Active Missing Cases'}
            </div>
            <div className="text-2xl font-black text-rose-300 mt-1">{stats.active || 0}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-2xl font-bold">
            🚨
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-800/40 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              {currentLanguage === 'hi' ? 'सफलतापूर्वक मिलाया गया' : 'Reunited with Group'}
            </div>
            <div className="text-2xl font-black text-emerald-300 mt-1">{stats.reunited || 0}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl font-bold">
            🤝
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-800/40 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
              {currentLanguage === 'hi' ? 'कुल दर्ज घटनाएं' : 'Total Logged Incidents'}
            </div>
            <div className="text-2xl font-black text-indigo-300 mt-1">{stats.total || 0}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-2xl font-bold">
            📋
          </div>
        </div>
      </div>

      {/* ── Filters & Search Bar ── */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap gap-3 items-center justify-between shadow-md">
        <div className="flex flex-wrap gap-2.5 items-center">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">{currentLanguage === 'hi' ? 'सभी स्थितियाँ (All)' : 'All Statuses'}</option>
            <option value="Reported">{currentLanguage === 'hi' ? '🚨 नया रिपोर्ट (Reported)' : '🚨 Reported'}</option>
            <option value="Rescue Dispatched">{currentLanguage === 'hi' ? '🚶‍♂️ बचाव दल भेजा गया' : '🚶‍♂️ Rescue Dispatched'}</option>
            <option value="Reunited">{currentLanguage === 'hi' ? '🤝 मिलाया गया (Reunited)' : '🤝 Reunited'}</option>
          </select>

          {/* Counter Filter */}
          <select
            value={counterFilter}
            onChange={(e) => setCounterFilter(e.target.value)}
            className="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 max-w-[200px] truncate"
          >
            <option value="">{currentLanguage === 'hi' ? 'सभी 10 काउंटर (All Counters)' : 'All 10 Counters'}</option>
            {MELA_COUNTERS.map((c) => (
              <option key={c.id} value={c.id}>
                Counter {c.id}: {c.location}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={currentLanguage === 'hi' ? 'नाम / पास ID / मोबाइल खोजें...' : 'Search name, pass ID, phone...'}
            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold">
          ⚠️ {error}
        </div>
      )}

      {/* ── Incidents Table / Cards ── */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold text-center">
          ⚠️ {error}
        </div>
      )}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block mr-2" />
          <span>{currentLanguage === 'hi' ? 'रिपोर्ट्स लोड हो रही हैं...' : 'Loading incidents...'}</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/50 border border-slate-800/80 rounded-3xl space-y-2">
          <div className="text-4xl">🕊️</div>
          <div className="text-sm font-bold text-slate-300">
            {currentLanguage === 'hi' ? 'कोई सक्रिय खोया-पाया केस नहीं है!' : 'No missing incidents logged!'}
          </div>
          <p className="text-xs text-slate-500">
            {currentLanguage === 'hi'
              ? 'मेला क्षेत्र के सभी सहायता काउंटरों पर सब सुरक्षित व सामान्य है।'
              : 'All mela assistance counters report normal conditions.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((report) => {
            const isReported = report.status === 'Reported';
            const isDispatched = report.status === 'Rescue Dispatched';
            const isReunited = report.status === 'Reunited';

            return (
              <div
                key={report._id}
                className={`p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between shadow-xl backdrop-blur-md relative overflow-hidden ${
                  isReported
                    ? 'bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 border-rose-600/50 hover:border-rose-500'
                    : isDispatched
                    ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-amber-600/50 hover:border-amber-500'
                    : 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-slate-800 opacity-80'
                }`}
              >
                {/* Status Glow Line */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    isReported ? 'bg-rose-500 animate-pulse' : isDispatched ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                />

                <div className="space-y-4">
                  {/* Top Bar: Code, Status, Time */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-amber-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                        {report.reportId}
                      </span>
                      {report.passId && (
                        <span className="font-mono text-[10px] text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-800">
                          Pass: {report.passId}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                        isReported
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                          : isDispatched
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>

                  {/* Pilgrim & Counter Info */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-16 h-20 rounded-2xl bg-slate-850 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {report.photoUrl ? (
                        <img src={report.photoUrl} alt={report.touristName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">👤</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <h4 className="text-base font-black text-white truncate leading-tight">
                        {report.touristName}
                      </h4>
                      {report.groupName && (
                        <div className="text-xs text-indigo-300 font-medium truncate">
                          👥 {report.groupName}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-300 font-mono">
                        📞 {report.phone || 'No phone'}
                      </div>
                      {report.emergencyContact?.phone && (
                        <div className="text-[11px] text-rose-300 font-mono font-bold truncate">
                          🚨 Emergency: {report.emergencyContact.phone} ({report.emergencyContact.relation || 'Family'})
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location & Reporting Counter Info */}
                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                      <span>📍</span>
                      <span className="truncate">{report.counterName}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-850">
                      <span>Reported by: {report.reportedBy} {report.volunteerPhone ? `(${report.volunteerPhone})` : ''}</span>
                      <span>{report.createdAt ? new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}</span>
                    </div>
                    {report.notes && (
                      <div className="text-[11px] text-slate-300 italic pt-1">
                        "{report.notes}"
                      </div>
                    )}
                    {report.assignedRescuer && (
                      <div className="text-[11px] text-amber-400 font-bold pt-1">
                        🚶‍♂️ Assigned Rescuer: {report.assignedRescuer}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2 justify-between">
                  {/* WhatsApp Family/Guide */}
                  <button
                    type="button"
                    onClick={() => handleWhatsAppFamily(report)}
                    className="py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>📲</span>
                    <span>{currentLanguage === 'hi' ? 'WhatsApp सूचना' : 'WhatsApp Family'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Dispatch Volunteer button */}
                    {!isReunited && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReport(report);
                          setIsDispatchModalOpen(true);
                        }}
                        className="py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer"
                      >
                        🚶‍♂️ {currentLanguage === 'hi' ? 'बचाव दल भेजें' : 'Dispatch Rescuer'}
                      </button>
                    )}

                    {/* Mark Reunited */}
                    {!isReunited ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(report._id, 'Reunited')}
                        className="py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
                      >
                        🤝 {currentLanguage === 'hi' ? 'मिलाया गया' : 'Reunited'}
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        ✓ {currentLanguage === 'hi' ? 'केस पूर्ण' : 'Resolved'}
                      </span>
                    )}

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteReport(report._id, report.reportId)}
                      className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                      title="Delete Record"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── DISPATCH RESCUER MODAL ── */}
      {isDispatchModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
                <span>🚶‍♂️</span>
                <span>{currentLanguage === 'hi' ? 'बचाव दल / वालंटियर नियुक्त करें' : 'Assign Rescue Marshal'}</span>
              </h3>
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300">
              {currentLanguage === 'hi'
                ? `श्रद्धालु: '${selectedReport.touristName}' (${selectedReport.counterName}) के पास किसे भेजा जा रहा है?`
                : `Assigning volunteer to assist '${selectedReport.touristName}' at ${selectedReport.counterName}:`}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                {currentLanguage === 'hi' ? 'वॉलंटियर / होमगार्ड का नाम व संपर्क' : 'Rescuer Name & Phone'}
              </label>
              <input
                type="text"
                value={rescuerName}
                onChange={(e) => setRescuerName(e.target.value)}
                placeholder="उदा: होमगार्ड अमित कुमार (9876543210)"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDispatchModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={actionLoading || !rescuerName.trim()}
                onClick={() => handleUpdateStatus(selectedReport._id, 'Rescue Dispatched', rescuerName)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Updating...' : currentLanguage === 'hi' ? 'बचाव दल रवाना करें' : 'Confirm Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
