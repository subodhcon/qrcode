import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Loading from '../components/Loading';

export default function AdminDashboard() {
  const navigate = useNavigate();

  // Tabs: 'categories' | 'analytics'
  const [activeTab, setActiveTab] = useState('categories');

  // Shared List States
  const [categories, setCategories] = useState([]);
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Announcement States
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementSuccess, setAnnouncementSuccess] = useState(false);

  // Feedback States
  const [feedbacks, setFeedbacks] = useState([]);


  // Form State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // holds category object
  const [formName, setFormName] = useState('');
  const [formEmoji, setFormEmoji] = useState('');
  const [formKeyword, setFormKeyword] = useState('');
  const [formGoogleType, setFormGoogleType] = useState('');
  const [formStatus, setFormStatus] = useState('Active');
  const [formError, setFormError] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Check auth
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
    }
  }, [navigate]);

  // Disable background scrolling when modal is open
  useEffect(() => {
    if (isFormModalOpen || isDeleteModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isFormModalOpen, isDeleteModalOpen]);

  // Fetch Categories data
  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/categories');
      setCategories(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load categories.');
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
      setTelemetry(response.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load telemetry stats.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncement = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/announcement');
      if (response && response.success && response.data) {
        setAnnouncementText(response.data.text);
      }
    } catch (err) {
      setError(err.message || 'Failed to load announcement.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbacks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/feedback');
      setFeedbacks(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load feedbacks.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveFeedback = async (id) => {
    try {
      const response = await api.put(`/feedback/${id}/resolve`);
      if (response && response.success) {
        setFeedbacks(prev => prev.map(item => item._id === id ? { ...item, status: item.status === 'Resolved' ? 'New' : 'Resolved' } : item));
      }
    } catch (err) {
      alert(err.message || 'Failed to update feedback status.');
    }
  };

  const handleDeleteFeedback = async (id) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      const response = await api.delete(`/feedback/${id}`);
      if (response && response.success) {
        setFeedbacks(prev => prev.filter(item => item._id !== id));
      }
    } catch (err) {
      alert(err.message || 'Failed to delete report.');
    }
  };

  const handleAnnouncementSubmit = async (e) => {
    e.preventDefault();
    setAnnouncementLoading(true);
    setAnnouncementSuccess(false);
    try {
      await api.post('/announcement', { text: announcementText });
      setAnnouncementSuccess(true);
      setTimeout(() => setAnnouncementSuccess(false), 3000);
    } catch (err) {
      alert(err.message || 'Failed to update announcement.');
    } finally {
      setAnnouncementLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'categories') {
      fetchCategories();
    } else if (activeTab === 'analytics') {
      fetchTelemetry();
    } else if (activeTab === 'announcements') {
      fetchAnnouncement();
    } else if (activeTab === 'feedback') {
      fetchFeedbacks();
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
    setFormEmoji('');
    setFormKeyword('');
    setFormGoogleType('');
    setFormStatus('Active');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormEmoji(item.emoji);
    setFormKeyword(item.keyword);
    setFormGoogleType(item.googleType || '');
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

    if (!formName.trim() || !formEmoji.trim() || !formKeyword.trim()) {
      setFormError('Name, Emoji, and Google Search Keyword are required.');
      setFormSubmitting(false);
      return;
    }

    try {
      const payload = {
        name: formName,
        emoji: formEmoji,
        keyword: formKeyword,
        googleType: formGoogleType,
        status: formStatus
      };

      if (editingItem) {
        await api.put(`/categories/${editingItem._id || editingItem.id}`, payload);
      } else {
        await api.post('/categories', payload);
      }
      fetchCategories();
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
      const targetId = itemToDelete._id || itemToDelete.id;
      await api.delete(`/categories/${targetId}`);
      fetchCategories();
      closeDeleteModal();
    } catch (err) {
      alert(err.message || 'Deletion failed.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <>
      <div className="max-w-6xl mx-auto my-8 px-4 space-y-6 animate-fade-slide-up">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white">Event Navigation Portal</h1>
          <p className="text-slate-400 text-xs mt-1">Developed by Confluxaa • Category Console Control</p>
        </div>
        <div className="flex gap-3">
          {activeTab === 'categories' && (
            <button
              onClick={openAddModal}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors shadow-md focus:outline-none flex items-center gap-1.5 cursor-pointer"
            >
              Add Search Category
            </button>
          )}
          <button
            onClick={handleLogout}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors focus:outline-none cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 gap-6 overflow-x-auto no-scrollbar whitespace-nowrap scroll-smooth pb-0.5">
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 text-sm font-extrabold transition-all border-b-2 cursor-pointer shrink-0 ${
            activeTab === 'categories' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Categories (ATM, Restrooms, Police, Food, etc.)
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 text-sm font-extrabold transition-all border-b-2 cursor-pointer shrink-0 ${
            activeTab === 'analytics' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Visitor Analytics
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`pb-3 text-sm font-extrabold transition-all border-b-2 cursor-pointer shrink-0 ${
            activeTab === 'announcements' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Official Announcements
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`pb-3 text-sm font-extrabold transition-all border-b-2 cursor-pointer shrink-0 ${
            activeTab === 'feedback' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          User Reports & Feedback
        </button>
      </div>

      {/* Dynamic Content Views */}
      {loading ? (
        <div className="h-60 flex items-center justify-center">
          <Loading message="Loading dashboard data..." />
        </div>
      ) : error ? (
        <div className="bg-slate-900 border border-red-500/10 rounded-2xl p-6 text-center text-red-400 text-sm shadow-md">
          {error}
        </div>
      ) : activeTab === 'categories' ? (
        /* Categories Table */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40">
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Category Name</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Emoji</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Google Search Keyword</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {categories.map((cat) => (
                  <tr key={cat._id || cat.id} className="hover:bg-slate-950/20 transition-colors">
                    <td className="py-4 px-6 font-bold text-white text-sm">{cat.name}</td>
                    <td className="py-4 px-6 text-slate-300 text-sm">{cat.emoji}</td>
                    <td className="py-4 px-6 font-mono text-slate-400 text-xs">{cat.keyword}</td>
                    <td className="py-4 px-6 text-slate-400 text-xs">
                      <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${cat.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {cat.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="py-1 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteModal(cat)}
                          className="py-1 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-6 px-6 text-center text-slate-500 text-xs">
                      No categories found. Click "Add Search Category" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'analytics' ? (
        /* Tab: Dashboard Analytics */
        <div className="space-y-6">
          {/* Key Metric Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 text-3xl">📱</div>
              <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">Total Scans Recorded</p>
              <h2 className="text-4xl font-black text-white mt-2">{telemetry?.totalScans || 0}</h2>
              <p className="text-[11px] text-slate-400 mt-1">Unique QR scan events (visitor counts)</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 text-3xl">🧭</div>
              <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">Total Route Navigations</p>
              <h2 className="text-4xl font-black text-emerald-400 mt-2">{telemetry?.totalNavigations || 0}</h2>
              <p className="text-[11px] text-slate-400 mt-1">Total visitor clicks on map routes</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* System Status info */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-extrabold text-white">System Status</h3>
              <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
                <p>🚀 Live GPS-enabled map system active.</p>
                <p>🌎 Google Maps live search API proxy linked.</p>
                <p>📱 Currently tracking {categories.length} active search categories.</p>
              </div>
            </div>

            {/* Click distributions */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-extrabold text-white">Category Search Requests</h3>
              <div className="space-y-4 pt-2">
                {Object.entries(telemetry?.facilityClicks || {}).map(([catName, clicksCount]) => (
                  <div key={catName}>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{catName}</span>
                      <span className="text-white font-bold">{clicksCount}</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (clicksCount / Math.max(1, telemetry?.totalScans || 1)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
                {Object.keys(telemetry?.facilityClicks || {}).length === 0 && (
                  <p className="text-xs text-slate-500">No clicks recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'announcements' ? (
        /* Tab: Announcements */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl text-left">
          <div>
            <h2 className="text-xl font-black text-white">Broadcast Center & Alert System</h2>
            <p className="text-slate-400 text-xs mt-1">Compose administrative announcements to overlay instantly on the visitor welcome page.</p>
          </div>

          <form onSubmit={handleAnnouncementSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Broadcast Notice Message</label>
              <textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="e.g. Traffic Route Update: Direct route to Vishnupad Temple is temporarily closed due to crowd management. Please follow police guidelines."
                rows={4}
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed max-w-xs">
                ⚠️ Publishing this alert will immediately override or prepend to the slideshow of official guidelines shown to visitors.
              </p>
              
              <button
                type="submit"
                disabled={announcementLoading}
                className="py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {announcementLoading ? 'Publishing...' : 'Publish Broadcast'}
              </button>
            </div>
          </form>

          {announcementSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center font-bold animate-fade-in">
              ✓ Broadcast published and live on visitor Welcome screen!
            </div>
          )}

          {/* Live Preview block */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 space-y-2">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Live Broadcast Preview</h4>
            <div className="rounded-2xl p-4 bg-slate-950/60 border border-amber-500/20 text-left space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span>📢 Live Announcement</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {announcementText || 'No active announcement. Default advisories will display.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Tab: Feedback & Reports */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl text-left animate-fade-in">
          <div>
            <h2 className="text-xl font-black text-white">Visitor Reports & Suggestions</h2>
            <p className="text-slate-400 text-xs mt-1">Review feedback, suggestions, and signboards/info reports submitted by visitors.</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40">
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Date</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Visitor Info</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Category</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Report Details / Message</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {feedbacks.map((report) => (
                  <tr key={report._id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-6 text-xs text-slate-400 font-mono">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-xs text-white">
                      <div className="font-bold">{report.name || 'Anonymous'}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{report.phone || 'No Phone'}</div>
                    </td>
                    <td className="py-4 px-6 text-xs">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        report.category === 'Incorrect Info' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                        report.category === 'Damaged Signboard' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                        report.category === 'Suggestion' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        'bg-slate-500/10 border-slate-500/20 text-slate-400'
                      }`}>
                        {report.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-300 leading-relaxed max-w-xs">
                      {report.message}
                    </td>
                    <td className="py-4 px-6 text-xs">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        report.status === 'Resolved' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400 animate-pulse'
                      }`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleResolveFeedback(report._id)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer border ${
                          report.status === 'Resolved' 
                            ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' 
                            : 'bg-emerald-600 border-emerald-500 hover:bg-emerald-500 text-white shadow-md'
                        }`}
                      >
                        {report.status === 'Resolved' ? 'Reopen' : 'Resolve'}
                      </button>
                      <button
                        onClick={() => handleDeleteFeedback(report._id)}
                        className="w-8/12 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-[10px] font-bold transition-all cursor-pointer inline-block text-center mt-1"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {feedbacks.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-xs text-slate-500 font-bold">
                      No reports or suggestions submitted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>

      {/* Add / Edit Form Modal Dialog */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto no-scrollbar bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="flex min-h-full items-start justify-center p-2">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 relative shadow-2xl animate-in fade-in duration-200 text-left my-4">
            <h2 className="text-lg font-black text-white mb-1">
              {editingItem ? 'Edit Search Category' : 'Add Search Category'}
            </h2>
            <p className="text-[11px] text-slate-400 mb-4">
              Create filter buttons for visitors to query live Google Maps listings.
            </p>

            {formError && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-bold">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label htmlFor="category-name" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category Name</label>
                  <input
                    id="category-name"
                    name="categoryName"
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. ATM, Toilet, Food"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="category-emoji" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Emoji Icon</label>
                  <input
                    id="category-emoji"
                    name="categoryEmoji"
                    type="text"
                    required
                    value={formEmoji}
                    onChange={(e) => setFormEmoji(e.target.value)}
                    placeholder="e.g. 🏧, 🚻, 🍔"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-center text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="google-keyword" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Google Search Keyword</label>
                  <input
                    id="google-keyword"
                    name="googleKeyword"
                    type="text"
                    required
                    value={formKeyword}
                    onChange={(e) => setFormKeyword(e.target.value)}
                    placeholder="e.g. atm, toilet, restaurant"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="google-type" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Google Place Type (Optional)</label>
                  <input
                    id="google-type"
                    name="googleType"
                    type="text"
                    value={formGoogleType}
                    onChange={(e) => setFormGoogleType(e.target.value)}
                    placeholder="e.g. bank, restaurant, hospital"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="Active">Active (Visible)</option>
                    <option value="Inactive">Inactive (Hidden)</option>
                  </select>
                </div>
                
                <div className="flex justify-end gap-2 pb-0.5">
                  <button
                    type="button"
                    onClick={closeFormModal}
                    className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors focus:outline-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-xs font-semibold transition-colors focus:outline-none flex items-center gap-1.5 cursor-pointer"
                  >
                    {formSubmitting && (
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    Save Category
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}

      {/* Delete Confirmation Modal Dialog */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto no-scrollbar bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="flex min-h-full items-start justify-center p-2">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-8 relative shadow-2xl animate-in fade-in duration-200 text-left my-4">
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
        </div>
      )}
    </>
  );
}
