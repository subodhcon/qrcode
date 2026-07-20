import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Loading from '../components/Loading';
import html2canvas from 'html2canvas';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const placardRef = useRef(null);

  // Tabs: 'facilities' | 'locations' | 'qr-manager' | 'analytics'
  const [activeTab, setActiveTab] = useState('facilities');

  // Shared List States
  const [facilities, setFacilities] = useState([]);
  const [locations, setLocations] = useState([]);
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // holds facility or location object
  const [formName, setFormName] = useState('');
  const [formLat, setFormLat] = useState('');
  const [formLng, setFormLng] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState('Medical'); // for facility types
  const [formStatus, setFormStatus] = useState('Active');
  const [formError, setFormError] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // QR Placard Selection State
  const [selectedPlacardGate, setSelectedPlacardGate] = useState(null);

  // Check auth
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
    }
  }, [navigate]);

  // Fetch Facilities data
  const fetchFacilities = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/medical?limit=100'); // fetch all facilities
      setFacilities(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load facilities.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Locations (Gates) data
  const fetchLocations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/locations');
      setLocations(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load locations.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Telemetry stats data
  const fetchTelemetry = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/analytics/telemetry');
      setTelemetry(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load telemetry stats.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'facilities') {
      fetchFacilities();
    } else if (activeTab === 'locations') {
      fetchLocations();
    } else if (activeTab === 'analytics') {
      fetchTelemetry();
    } else {
      fetchLocations(); // default fallback for qr-manager
    }
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  // Form Modals
  const openAddModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormLat('');
    setFormLng('');
    setFormDesc('');
    setFormType(activeTab === 'facilities' ? 'Medical' : 'Gate');
    setFormStatus('Active');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormLat(item.latitude.toString());
    setFormLng(item.longitude.toString());
    setFormDesc(item.description || '');
    setFormType(item.type || 'Medical');
    setFormStatus(item.status || 'Active');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setEditingItem(null);
  };

  // Handle Create/Update
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    if (!formName.trim()) {
      setFormError('Name is required.');
      setFormSubmitting(false);
      return;
    }

    const latNum = parseFloat(formLat);
    const lngNum = parseFloat(formLng);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setFormError('Latitude must be a valid coordinate (-90 to 90).');
      setFormSubmitting(false);
      return;
    }

    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setFormError('Longitude must be a valid coordinate (-180 to 180).');
      setFormSubmitting(false);
      return;
    }

    try {
      const payload = {
        name: formName,
        latitude: latNum,
        longitude: lngNum,
        description: formDesc,
        type: formType,
        status: formStatus
      };

      if (activeTab === 'facilities') {
        if (editingItem) {
          await api.put(`/medical/${editingItem.id}`, payload);
        } else {
          await api.post('/medical', payload);
        }
        fetchFacilities();
      } else {
        if (editingItem) {
          await api.put(`/locations/${editingItem.id}`, payload);
        } else {
          await api.post('/locations', payload);
        }
        fetchLocations();
      }
      closeFormModal();
    } catch (err) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Delete
  const openDeleteModal = (item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setDeleteSubmitting(true);
    try {
      if (activeTab === 'facilities') {
        await api.delete(`/medical/${itemToDelete.id}`);
        fetchFacilities();
      } else {
        await api.delete(`/locations/${itemToDelete.id}`);
        fetchLocations();
      }
      closeDeleteModal();
    } catch (err) {
      alert(err.message || 'Deletion failed.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Placard Download capture
  const downloadPlacard = async (gateName, gateSlug) => {
    if (!placardRef.current) return;
    try {
      const canvas = await html2canvas(placardRef.current, {
        useCORS: true,
        backgroundColor: '#020617',
        scale: 2
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${gateSlug}-placard.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to capture placard:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto my-8 px-4 space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white">Event Navigation Portal</h1>
          <p className="text-slate-400 text-xs mt-1">Developed by Confluxaa • Console Control System</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={openAddModal}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors shadow-md focus:outline-none flex items-center gap-1.5 cursor-pointer"
          >
            Add {activeTab === 'facilities' ? 'Facility' : 'Location Gate'}
          </button>
          <button
            onClick={handleLogout}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors focus:outline-none cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('facilities')}
          className={`pb-3 text-sm font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === 'facilities' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Facilities (Medical, Restrooms, Police)
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`pb-3 text-sm font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === 'locations' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Gate Locations
        </button>
        <button
          onClick={() => setActiveTab('qr-manager')}
          className={`pb-3 text-sm font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === 'qr-manager' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          QR Placard Manager
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 text-sm font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === 'analytics' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Dashboard Analytics
        </button>
      </div>

      {/* Dynamic Content Views */}
      {loading ? (
        <div className="h-60 flex items-center justify-center">
          <Loading message="Loading data coordinates..." />
        </div>
      ) : error ? (
        <div className="bg-slate-900 border border-red-500/10 rounded-2xl p-6 text-center text-red-400 text-sm shadow-md">
          {error}
        </div>
      ) : activeTab === 'facilities' ? (
        /* Facilities Table */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40">
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Facility Name</th>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Type</th>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Coordinates</th>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {facilities.map((fac) => (
                <tr key={fac.id} className="hover:bg-slate-950/20 transition-colors">
                  <td className="py-4 px-6 font-bold text-white text-sm">{fac.name}</td>
                  <td className="py-4 px-6 text-slate-400 text-xs font-mono">{fac.type || 'Medical'}</td>
                  <td className="py-4 px-6 font-mono text-slate-400 text-xs">
                    {fac.latitude.toFixed(5)}, {fac.longitude.toFixed(5)}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(fac)}
                        className="py-1 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteModal(fac)}
                        className="py-1 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'locations' ? (
        /* Locations Table */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40">
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Gate Name</th>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Slug</th>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Coordinates</th>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {locations.map((loc) => (
                <tr key={loc.id} className="hover:bg-slate-950/20 transition-colors">
                  <td className="py-4 px-6 font-bold text-white text-sm">{loc.name}</td>
                  <td className="py-4 px-6 text-emerald-400 text-xs font-mono">/location/{loc.slug}</td>
                  <td className="py-4 px-6 font-mono text-slate-400 text-xs">
                    {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(loc)}
                        className="py-1 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteModal(loc)}
                        className="py-1 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'qr-manager' ? (
        /* QR Placard Manager */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {locations.map((loc) => (
            <div key={loc.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-md text-center">
              <span className="text-2xl">🖼️</span>
              <h3 className="font-extrabold text-white text-base">{loc.name}</h3>
              <p className="text-xs text-slate-400">Print Sign Placard for {loc.name}</p>
              <button
                onClick={() => setSelectedPlacardGate(loc)}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Preview & Print
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* Tab: Dashboard Analytics Visual Panel */
        <div className="space-y-6">
          {/* Key Metric Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 text-3xl">📱</div>
              <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">Total Scans Recorded</p>
              <h2 className="text-4xl font-black text-white mt-2">{telemetry?.totalScans || 0}</h2>
              <p className="text-[11px] text-slate-400 mt-1">Unique QR entry point scans</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 text-3xl">🧭</div>
              <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">Total Route Navigations</p>
              <h2 className="text-4xl font-black text-emerald-400 mt-2">{telemetry?.totalNavigations || 0}</h2>
              <p className="text-[11px] text-slate-400 mt-1">Calculated walking routes requested</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Popular Gate Locations */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-extrabold text-white">Popular Scan Gate Locations</h3>
              <div className="divide-y divide-slate-800/60">
                {telemetry?.popularLocations?.map((loc, idx) => (
                  <div key={loc.slug} className="py-3 flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-300">
                      {idx + 1}. {loc.name}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md">
                      {loc.scans} scans
                    </span>
                  </div>
                )) || <div className="text-xs text-slate-500 py-2">No location scans logged.</div>}
              </div>
            </div>

            {/* Click distributions */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-extrabold text-white">Facility Requests Distribution</h3>
              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>🚑 Medical Care</span>
                    <span className="text-white font-bold">{telemetry?.facilityClicks?.Medical || 0}</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, ((telemetry?.facilityClicks?.Medical || 0) / Math.max(1, telemetry?.totalScans || 1)) * 100)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>🚻 Toilet / Restrooms</span>
                    <span className="text-white font-bold">{telemetry?.facilityClicks?.Toilet || 0}</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${Math.min(100, ((telemetry?.facilityClicks?.Toilet || 0) / Math.max(1, telemetry?.totalScans || 1)) * 100)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>🚨 Campus Security</span>
                    <span className="text-white font-bold">{telemetry?.facilityClicks?.Police || 0}</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(100, ((telemetry?.facilityClicks?.Police || 0) / Math.max(1, telemetry?.totalScans || 1)) * 100)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>ℹ️ Help Desk</span>
                    <span className="text-white font-bold">{telemetry?.facilityClicks?.Help || 0}</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="bg-teal-500 h-full rounded-full" style={{ width: `${Math.min(100, ((telemetry?.facilityClicks?.Help || 0) / Math.max(1, telemetry?.totalScans || 1)) * 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Placard Preview Modal */}
      {selectedPlacardGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-sm space-y-6">
            
            {/* Placard Node Capture Container */}
            <div 
              ref={placardRef}
              className="relative w-full bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-[32px] p-6 shadow-2xl space-y-6 text-center overflow-hidden"
            >
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Scan & Navigate
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">{selectedPlacardGate.name} Access</h2>
                <p className="text-xs text-slate-400">Campus Location System</p>
              </div>

              {/* QR Image Wrapper */}
              <div className="relative w-56 h-56 mx-auto bg-slate-950 rounded-3xl p-5 border border-slate-800 flex items-center justify-center">
                <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl" />
                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr" />
                <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl" />
                <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br" />

                <div className="w-full h-full bg-white rounded-2xl p-3 flex items-center justify-center overflow-hidden">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin + "/location/" + selectedPlacardGate.slug)}`} 
                    alt="Gate QR Code" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-extrabold text-white">📍 You Are Here</p>
                <p className="text-xs text-slate-400 px-4 leading-relaxed">
                  Scan with your mobile phone to check current coordinates and walk routes to nearest clinics.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-900 text-[10px] text-slate-600 font-mono flex items-center justify-center gap-1">
                <span>Developed by</span>
                <span className="font-black text-slate-400">Confluxaa</span>
              </div>
            </div>

            {/* Modal Controls */}
            <div className="flex gap-4">
              <button
                onClick={() => setSelectedPlacardGate(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs uppercase tracking-wider cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => downloadPlacard(selectedPlacardGate.name, selectedPlacardGate.slug)}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs uppercase tracking-wider cursor-pointer"
              >
                Download Placard Image
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Add / Edit Form Modal Dialog */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-8 relative shadow-2xl animate-in fade-in duration-200">
            <h2 className="text-xl font-black text-white mb-2">
              {editingItem ? 'Edit Coordinate Record' : 'Add Coordinate Record'}
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Enter target coordinates to update the navigation database.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Main Gate, Parking A, Clinic South"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {activeTab === 'facilities' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Facility Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="Medical">Medical Care / Clinic</option>
                    <option value="Toilet">Toilet / Restroom</option>
                    <option value="Police">Police Booth / Security</option>
                    <option value="Help">Visitor Info / Help Desk</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Latitude</label>
                  <input
                    type="text"
                    required
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                    placeholder="e.g. 51.50500"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Longitude</label>
                  <input
                    type="text"
                    required
                    value={formLng}
                    onChange={(e) => setFormLng(e.target.value)}
                    placeholder="e.g. -0.09000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</label>
                <textarea
                  rows="3"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Provide general directions or coordinate info..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors focus:outline-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-sm font-semibold transition-colors focus:outline-none flex items-center gap-1.5 cursor-pointer"
                >
                  {formSubmitting && (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  Save Coordinate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Dialog */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-8 relative shadow-2xl animate-in fade-in duration-200">
            <h2 className="text-xl font-black text-white mb-2">Confirm Deletion</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">"{itemToDelete?.name}"</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors focus:outline-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteSubmitting}
                className="py-2.5 px-5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white text-sm font-semibold transition-colors focus:outline-none flex items-center gap-1.5 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
