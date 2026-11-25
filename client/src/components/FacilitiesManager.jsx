import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../context/LanguageContext';
import api from '../services/api';

const FACILITY_TYPES = [
  { value: 'Temple', emoji: '🛕' },
  { value: 'Medical', emoji: '🏥' },
  { value: 'Drinking Water', emoji: '💧' },
  { value: 'Restrooms', emoji: '🚻' },
  { value: 'Security', emoji: '🛡️' },
  { value: 'Parking', emoji: '🅿️' },
  { value: 'Food & Dining', emoji: '🍽️' },
  { value: 'Help Desk', emoji: 'ℹ️' },
  { value: 'Lost and Found', emoji: '🧳' }
];

export default function FacilitiesManager() {
  const { t, currentLanguage } = useTranslation();

  // Sub-view: 'facilities' | 'locations'
  const [subView, setSubView] = useState('facilities');

  // Facilities state
  const [facilities, setFacilities] = useState([]);
  const [facLoading, setFacLoading] = useState(true);
  const [facSearch, setFacSearch] = useState('');
  const [facTypeFilter, setFacTypeFilter] = useState('');
  const [facPage, setFacPage] = useState(1);
  const [facPagination, setFacPagination] = useState({ total: 0, totalPages: 1 });

  // Locations (QR Gates) state
  const [locations, setLocations] = useState([]);
  const [locLoading, setLocLoading] = useState(false);

  // Modal state (shared for Add/Edit Facility or Location)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('Medical');
  const [formLat, setFormLat] = useState('24.6961');
  const [formLng, setFormLng] = useState('84.9913');
  const [formDesc, setFormDesc] = useState('');
  const [formStatus, setFormStatus] = useState('Active');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [gpsDetecting, setGpsDetecting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchFacilities = useCallback(async () => {
    setFacLoading(true);
    try {
      const params = new URLSearchParams({ page: String(facPage), limit: '12' });
      if (facSearch.trim()) params.append('search', facSearch.trim());
      if (facTypeFilter) params.append('type', facTypeFilter);

      const res = await api.get(`/medical?${params.toString()}`);
      if (res && res.success) {
        setFacilities(Array.isArray(res.data) ? res.data : []);
        setFacPagination(res.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to fetch facilities:', err);
    } finally {
      setFacLoading(false);
    }
  }, [facPage, facSearch, facTypeFilter]);

  const fetchLocations = useCallback(async () => {
    setLocLoading(true);
    try {
      const res = await api.get('/locations');
      if (res && res.success) {
        setLocations(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    } finally {
      setLocLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subView === 'facilities') {
      fetchFacilities();
    } else {
      fetchLocations();
    }
  }, [subView, fetchFacilities, fetchLocations]);

  const openModal = (item = null) => {
    setEditingItem(item);
    setFormName(item?.name || '');
    setFormType(item?.type || (subView === 'locations' ? 'Gate' : 'Medical'));
    setFormLat(item?.latitude != null ? String(item.latitude) : '24.6961');
    setFormLng(item?.longitude != null ? String(item.longitude) : '84.9913');
    setFormDesc(item?.description || '');
    setFormStatus(item?.status || 'Active');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      setFormError('GPS not supported in this browser.');
      return;
    }
    setGpsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormLat(pos.coords.latitude.toFixed(6));
        setFormLng(pos.coords.longitude.toFixed(6));
        setGpsDetecting(false);
      },
      () => {
        setFormError(currentLanguage === 'hi' ? 'GPS नहीं मिल सका। कृपया मैनुअल निर्देशांक भरें।' : 'Unable to detect GPS. Enter coordinates manually.');
        setGpsDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const latNum = parseFloat(formLat);
    const lngNum = parseFloat(formLng);
    if (!formName.trim() || Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      setFormError(t('fillRequiredCoords') || 'Name, valid Latitude, and Longitude are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formName.trim(),
        type: formType,
        latitude: latNum,
        longitude: lngNum,
        description: formDesc.trim(),
        status: formStatus
      };

      const endpoint = subView === 'facilities' ? '/medical' : '/locations';
      if (editingItem) {
        await api.put(`${endpoint}/${editingItem._id || editingItem.id}`, payload);
        showToast(t('placeUpdatedSuccess') || '✓ Updated successfully!');
      } else {
        await api.post(endpoint, payload);
        showToast(t('placeAddedSuccess') || '✓ Added successfully!');
      }

      setIsModalOpen(false);
      if (subView === 'facilities') fetchFacilities();
      else fetchLocations();
    } catch (err) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleFacilityStatus = async (item) => {
    try {
      const nextStatus = item.status === 'Active' ? 'Inactive' : 'Active';
      await api.put(`/medical/${item._id}`, {
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
        description: item.description || '',
        type: item.type,
        status: nextStatus
      });
      fetchFacilities();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (item) => {
    const label = item?.name || 'this item';
    if (!window.confirm(`Delete "${label}"?`)) return;
    try {
      const endpoint = subView === 'facilities' ? '/medical' : '/locations';
      await api.delete(`${endpoint}/${item._id || item.id}`);
      showToast(t('placeDeletedSuccess') || '✓ Deleted successfully.');
      if (subView === 'facilities') fetchFacilities();
      else fetchLocations();
    } catch (err) {
      alert(err.message || 'Delete failed.');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in text-white">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold border border-emerald-400">
          {toast}
        </div>
      )}

      {/* Header & Sub-View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div>
          <h2 className="text-lg sm:text-xl font-black tracking-wide text-white flex items-center gap-2">
            <span>📍</span>
            <span>{t('placesManagerTitle') || 'Places, Gates & Facilities Manager'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('placesManagerSub') || 'Add or update temples, temporary toilets, water kiosks, medical camps, and QR gate coordinates live.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1">
            <button
              type="button"
              onClick={() => setSubView('facilities')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subView === 'facilities' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              🏥 {t('facilitiesSubTab') || 'Facilities'} ({facPagination.total || facilities.length})
            </button>
            <button
              type="button"
              onClick={() => setSubView('locations')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subView === 'locations' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              ⛩️ {t('gatesSubTab') || 'QR Gates'} ({locations.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => openModal(null)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            + {subView === 'facilities' ? (t('addFacilityBtn') || 'Add Facility') : (t('addGateBtn') || 'Add Gate')}
          </button>
        </div>
      </div>

      {/* Filters Bar for Facilities */}
      {subView === 'facilities' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap gap-3 items-center justify-between">
          <select
            value={facTypeFilter}
            onChange={(e) => { setFacTypeFilter(e.target.value); setFacPage(1); }}
            className="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">{t('allCategoriesOption') || 'All 9 Categories'}</option>
            {FACILITY_TYPES.map((ft) => (
              <option key={ft.value} value={ft.value}>
                {ft.emoji} {t(ft.value) || ft.value}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={facSearch}
            onChange={(e) => { setFacSearch(e.target.value); setFacPage(1); }}
            placeholder={t('searchFacilitiesPlaceholder') || 'Search facility name or description...'}
            className="w-full sm:w-72 px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      )}

      {/* Table View */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {(subView === 'facilities' ? facLoading : locLoading) ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-950/40">
                  <th className="py-3.5 px-5">{t('nameCol') || 'Name'}</th>
                  <th className="py-3.5 px-5">{t('typeCol') || 'Category / Type'}</th>
                  <th className="py-3.5 px-5">{t('coordsCol') || 'GPS Coordinates'}</th>
                  <th className="py-3.5 px-5">{t('statusCol') || 'Status'}</th>
                  <th className="py-3.5 px-5 text-right">{t('actionsCol') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {(subView === 'facilities' ? facilities : locations).map((item) => (
                  <tr key={item._id || item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-white">{item.name}</div>
                      {item.description && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{item.description}</div>
                      )}
                      {item.slug && (
                        <div className="text-[10px] font-mono text-amber-400">/location/{item.slug}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-medium">
                        {t(item.type) || item.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-slate-300 text-[11px]">
                      {Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}
                    </td>
                    <td className="py-3.5 px-5">
                      {subView === 'facilities' ? (
                        <button
                          type="button"
                          onClick={() => handleToggleFacilityStatus(item)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border cursor-pointer ${
                            item.status === 'Active'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {item.status || 'Active'}
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openModal(item)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold cursor-pointer"
                      >
                        ✏️ {t('editBtn') || 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 font-bold cursor-pointer"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
                {(subView === 'facilities' ? facilities : locations).length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-10 text-center text-slate-500">
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination for Facilities */}
        {subView === 'facilities' && facPagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Page {facPage} of {facPagination.totalPages}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={facPage <= 1}
                onClick={() => setFacPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                ← Prev
              </button>
              <button
                type="button"
                disabled={facPage >= facPagination.totalPages}
                onClick={() => setFacPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">
                {editingItem
                  ? (t('editPlaceTitle') || 'Edit Place / Facility')
                  : (t('addPlaceTitle') || 'Add New Place / Facility')}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">{t('nameCol') || 'Name'} *</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Kalachakra Mobile Medical Camp"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">{t('typeCol') || 'Category / Type'}</label>
                {subView === 'facilities' ? (
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    {FACILITY_TYPES.map((ft) => (
                      <option key={ft.value} value={ft.value}>
                        {ft.emoji} {t(ft.value) || ft.value}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    placeholder="Gate / Temple"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">{t('statusCol') || 'Status'}</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-300">{t('coordsCol') || 'GPS Coordinates'} *</span>
                <button
                  type="button"
                  onClick={handleUseCurrentGps}
                  disabled={gpsDetecting}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-bold cursor-pointer"
                >
                  {gpsDetecting ? 'Detecting...' : '📍 Use My GPS'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="any"
                  required
                  value={formLat}
                  onChange={(e) => setFormLat(e.target.value)}
                  placeholder="Latitude (24.6961)"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white"
                />
                <input
                  type="number"
                  step="any"
                  required
                  value={formLng}
                  onChange={(e) => setFormLng(e.target.value)}
                  placeholder="Longitude (84.9913)"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">{t('descriptionLabel') || 'Description'}</label>
              <textarea
                rows={2}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Landmark details or timings..."
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Saving...' : (t('saveChangesBtn') || 'Save')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
