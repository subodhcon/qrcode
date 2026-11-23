import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Loading from '../components/Loading';
import TouristDesk from '../components/TouristDesk';
import { useTranslation } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

const EMOJI_PRESETS = ['🛕', '💧', '🚻', '🏥', 'ℹ️', '🛡️', '🅿️', '🍽️', '🏧', '🏨', '🚌', '🛍️', '🌳', '📍'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Tabs: 'tourists' | 'categories' | 'analytics' | 'announcements' | 'feedback'
  const [activeTab, setActiveTab] = useState('tourists');

  // Shared List States
  const [categories, setCategories] = useState([]);
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Announcement States
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementSuccess, setAnnouncementSuccess] = useState(false);

  // Feedback States & Filter
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackFilter, setFeedbackFilter] = useState('all'); // 'all' | 'new' | 'resolved'
  const [feedbackActionToast, setFeedbackActionToast] = useState(null);

  // Form State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // holds category object
  const [formName, setFormName] = useState('');
  const [formEmoji, setFormEmoji] = useState('🛕');
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
      const catList = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
      setCategories(catList);
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
        setAnnouncementText(response.data.text || '');
      } else {
        setAnnouncementText('');
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
      const feedList = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
      setFeedbacks(feedList);
    } catch (err) {
      setError(err.message || 'Failed to load feedbacks.');
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Instant Status Toggle for Categories
  const handleToggleCategoryStatus = async (cat) => {
    const newStatus = cat.status === 'Active' ? 'Inactive' : 'Active';
    const targetId = cat._id || cat.id;
    // Optimistic UI update
    setCategories(prev => prev.map(c => ((c._id || c.id) === targetId ? { ...c, status: newStatus } : c)));
    try {
      await api.put(`/categories/${targetId}`, {
        name: cat.name,
        emoji: cat.emoji,
        keyword: cat.keyword,
        googleType: cat.googleType,
        status: newStatus
      });
    } catch (err) {
      alert('Failed to update category status: ' + (err.message || 'Error'));
      fetchCategories();
    }
  };

  // Citizen Support Desk: Resolve / Reopen Feedback Report
  const handleResolveFeedback = async (id) => {
    try {
      const response = await api.put(`/feedback/${id}/resolve`);
      if (response && response.success) {
        const updatedStatus = response.data?.status || 'Resolved';
        setFeedbacks(prev => prev.map(item => item._id === id ? { ...item, status: updatedStatus } : item));
        setFeedbackActionToast(`Report marked as ${updatedStatus}`);
        setTimeout(() => setFeedbackActionToast(null), 3000);
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
        setFeedbackActionToast('Report deleted successfully.');
        setTimeout(() => setFeedbackActionToast(null), 3000);
      }
    } catch (err) {
      alert(err.message || 'Failed to delete report.');
    }
  };

  // Official Broadcast Center: Publish
  const handleAnnouncementSubmit = async (e) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    setAnnouncementLoading(true);
    setAnnouncementSuccess(false);
    try {
      await api.post('/announcement', { text: announcementText.trim() });
      setAnnouncementSuccess('✓ Broadcast published and live on Welcome screen slider!');
      setTimeout(() => setAnnouncementSuccess(false), 3500);
    } catch (err) {
      alert(err.message || 'Failed to update announcement.');
    } finally {
      setAnnouncementLoading(false);
    }
  };

  // Official Broadcast Center: Clear Announcement
  const handleClearAnnouncement = async () => {
    if (!window.confirm('Are you sure you want to clear the broadcast announcement? Default advisories will immediately be restored on the visitor screen.')) return;
    setAnnouncementLoading(true);
    try {
      await api.delete('/announcement');
      setAnnouncementText('');
      setAnnouncementSuccess('✓ Broadcast cleared! Default official advisories restored on Welcome screen.');
      setTimeout(() => setAnnouncementSuccess(false), 3500);
    } catch (err) {
      alert(err.message || 'Failed to clear announcement.');
    } finally {
      setAnnouncementLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tourists') {
      setLoading(false);
      setError(null);
    } else if (activeTab === 'categories') {
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
    setFormEmoji('🛕');
    setFormKeyword('');
    setFormGoogleType('');
    setFormStatus('Active');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormName(item.name || '');
    setFormEmoji(item.emoji || '🛕');
    setFormKeyword(item.keyword || '');
    setFormGoogleType(item.googleType || '');
    setFormStatus(item.status || 'Active');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setEditingItem(null);
  };

  // Handle Create/Update Category
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    if (!formName.trim() || !formEmoji.trim() || !formKeyword.trim()) {
      setFormError('Name, Emoji, and Search Keyword are required.');
      setFormSubmitting(false);
      return;
    }

    try {
      const payload = {
        name: formName.trim(),
        emoji: formEmoji.trim(),
        keyword: formKeyword.trim(),
        googleType: formGoogleType.trim(),
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

  // Safe defensive array wrappers to guarantee zero runtime exceptions
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeFeedbacks = Array.isArray(feedbacks) ? feedbacks : [];

  // Filtered feedbacks list for Citizen Support Desk
  const filteredFeedbacks = safeFeedbacks.filter((report) => {
    if (feedbackFilter === 'new') return report?.status !== 'Resolved';
    if (feedbackFilter === 'resolved') return report?.status === 'Resolved';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 py-8 px-4 sm:px-6 lg:px-8 relative selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-emerald-500/5 via-teal-500/5 to-transparent blur-3xl rounded-full" />
      
      <div className="max-w-6xl mx-auto space-y-6 relative z-10 animate-fade-slide-up">
        
        {/* Title Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
          <div className="space-y-1.5 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t('adminConsoleBadge')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {t('adminTitle')}
            </h1>
            <p className="text-slate-400 text-xs font-medium">
              {t('adminSubtitle')}
            </p>
          </div>
          
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
            {/* Language Selector Dropdown */}
            <div className="backdrop-blur-md bg-slate-800/90 rounded-2xl p-0.5 border border-slate-700/80 shadow-md">
              <LanguageSelector />
            </div>

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-bold transition-all border border-slate-700/60 shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="Open public Welcome page in new tab"
            >
              <span>🌐</span>
              <span>{t('liveGuide')}</span>
            </a>

            {activeTab === 'categories' && (
              <button
                onClick={openAddModal}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <span className="text-base leading-none">＋</span>
                <span>{t('addCategory')}</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="py-2.5 px-3.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 text-slate-300 text-xs sm:text-sm font-bold transition-all border border-slate-700/60 cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>{t('logout')}</span>
            </button>
          </div>
        </div>

        {/* Segmented Tabs Navigation */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-1.5 flex gap-2 overflow-x-auto no-scrollbar shadow-lg backdrop-blur-md">
          <button
            onClick={() => setActiveTab('tourists')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'tourists'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <span>👥 {t('touristDeskTab')}</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">
              {t('registrationBadge')}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'categories'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <span>🗂️ {t('categoriesTab')}</span>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-300 border border-slate-700 font-mono">
              {safeCategories.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'announcements'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <span>📢 {t('broadcastTab')}</span>
            {announcementText && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('feedback')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'feedback'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <span>📝 {t('citizenSupportTab')}</span>
            {safeFeedbacks.filter(f => f?.status !== 'Resolved').length > 0 && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-black animate-pulse">
                {safeFeedbacks.filter(f => f?.status !== 'Resolved').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'analytics'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <span>📊 {t('analyticsTab')}</span>
          </button>
        </div>

        {/* Dynamic Content Views */}
        {loading ? (
          <div className="h-64 flex items-center justify-center bg-slate-900/60 border border-slate-800/60 rounded-3xl backdrop-blur-md">
            <Loading message="Loading dashboard data..." />
          </div>
        ) : error ? (
          <div className="bg-slate-900/90 border border-rose-500/30 rounded-3xl p-6 text-center text-rose-400 text-sm shadow-xl backdrop-blur-md">
            {error}
          </div>
        ) : activeTab === 'tourists' ? (
          <TouristDesk />
        ) : activeTab === 'categories' ? (
          
          /* ── MODULE 1: CATEGORIES MANAGEMENT ── */
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold">
                💡 Tip: Click on any <strong className="text-emerald-400">Status badge</strong> in the table to instantly toggle between Active and Inactive.
              </span>
              <span className="text-[11px] font-mono">{safeCategories.length} total categories</span>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60">
                    <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">Category Name</th>
                    <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">Icon</th>
                    <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">Search Keyword</th>
                    <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">Status (1-Click Toggle)</th>
                    <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {safeCategories.map((cat) => (
                    <tr key={cat._id || cat.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 font-bold text-white text-sm">{cat.name}</td>
                      <td className="py-4 px-6">
                        <div className="w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-lg shadow-sm">
                          {cat.emoji}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-emerald-400 bg-slate-950 px-2.5 py-1 rounded-md text-xs border border-slate-800/80">
                          {cat.keyword}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleToggleCategoryStatus(cat)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                            cat.status === 'Active'
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                          }`}
                          title="Click to toggle Active / Inactive"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cat.status === 'Active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                          <span>{cat.status || 'Active'}</span>
                        </button>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(cat)}
                            className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/60 transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteModal(cat)}
                            className="py-1.5 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {safeCategories.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-12 px-6 text-center text-slate-500 text-sm">
                        No categories found. Click "Add Category" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        ) : activeTab === 'announcements' ? (
          
          /* ── MODULE 2: OFFICIAL BROADCAST CENTER ── */
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-xl text-left">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold mb-2">
                  <span>📢 Emergency &amp; Event Broadcast</span>
                </div>
                <h2 className="text-xl font-black text-white">Broadcast Center &amp; Alert System</h2>
                <p className="text-slate-400 text-xs mt-1">Compose administrative announcements to overlay instantly on the visitor welcome page.</p>
              </div>

              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                <span>👁️ View on Welcome Page</span>
                <span className="text-slate-500 text-xs">↗</span>
              </a>
            </div>

            <form onSubmit={handleAnnouncementSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Broadcast Notice Message</label>
                <textarea
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="e.g. यातायात सूचना: महाबोधि मंदिर मार्ग श्रद्धालुओं के लिए खुला है। कृपया पुलिस कतार नियमों का पालन करें।"
                  rows={4}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-4 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-sm">
                  ⚠️ Publishing this alert will immediately update the official guidelines slideshow shown to all visitors on the Welcome page.
                </p>
                
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  {announcementText && (
                    <button
                      type="button"
                      onClick={handleClearAnnouncement}
                      disabled={announcementLoading}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 border border-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                      Clear Broadcast
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={announcementLoading}
                    className="flex-1 sm:flex-none py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  >
                    {announcementLoading ? 'Publishing...' : 'Publish Broadcast'}
                  </button>
                </div>
              </div>
            </form>

            {announcementSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs text-center font-bold animate-fade-in">
                {announcementSuccess}
              </div>
            )}

            {/* Live Preview block */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Broadcast Preview (Visitor View)</h4>
              <div className="rounded-2xl p-4 bg-slate-900/90 border border-amber-500/30 text-left space-y-1.5 shadow-md">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                  <span>📢 Official Advisory Notice</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {announcementText || 'No active announcement. Default advisories will display.'}
                </p>
              </div>
            </div>
          </div>

        ) : activeTab === 'feedback' ? (
          
          /* ── MODULE 3: CITIZEN SUPPORT DESK (FEEDBACK & REPORTS) ── */
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-xl text-left animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold mb-2">
                  <span>📝 Citizen Support Desk</span>
                </div>
                <h2 className="text-xl font-black text-white">Visitor Reports &amp; Suggestions</h2>
                <p className="text-slate-400 text-xs mt-1">Review feedback, suggestions, and signboards/info reports submitted by visitors.</p>
              </div>

              {/* Status Filter Segment */}
              <div className="bg-slate-950 border border-slate-800 p-1 rounded-xl flex gap-1 text-xs font-bold shrink-0">
                <button
                  onClick={() => setFeedbackFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    feedbackFilter === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({feedbacks.length})
                </button>
                <button
                  onClick={() => setFeedbackFilter('new')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    feedbackFilter === 'new' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Pending</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                  <span>({feedbacks.filter(f => f.status !== 'Resolved').length})</span>
                </button>
                <button
                  onClick={() => setFeedbackFilter('resolved')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    feedbackFilter === 'resolved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Resolved ({feedbacks.filter(f => f.status === 'Resolved').length})
                </button>
              </div>
            </div>

            {feedbackActionToast && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs text-center font-bold animate-fade-in">
                {feedbackActionToast}
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60">
                    <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">Date</th>
                    <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">Visitor Info</th>
                    <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">Category</th>
                    <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">Message Details</th>
                    <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                    <th className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredFeedbacks.map((report) => (
                    <tr key={report._id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 px-6 text-xs text-slate-400 font-mono">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-xs text-white">
                        <div className="font-bold">{report.name || 'Anonymous'}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{report.phone || 'No Phone'}</div>
                      </td>
                      <td className="py-4 px-6 text-xs">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          report.category === 'Incorrect Info' ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' :
                          report.category === 'Damaged Signboard' ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' :
                          report.category === 'Suggestion' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                          'bg-slate-500/15 border-slate-500/30 text-slate-300'
                        }`}>
                          {report.category}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-300 leading-relaxed max-w-xs">
                        {report.message}
                      </td>
                      <td className="py-4 px-6 text-xs">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                          report.status === 'Resolved' 
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                            : 'bg-rose-500/15 border-rose-500/30 text-rose-400 animate-pulse'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${report.status === 'Resolved' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          {report.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleResolveFeedback(report._id)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                              report.status === 'Resolved' 
                                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700' 
                                : 'bg-emerald-600 border-emerald-500/50 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                            }`}
                          >
                            {report.status === 'Resolved' ? 'Reopen' : 'Resolve'}
                          </button>
                          <button
                            onClick={() => handleDeleteFeedback(report._id)}
                            className="px-3 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-bold transition-all cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredFeedbacks.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-xs text-slate-500 font-bold">
                        {feedbackFilter === 'all' 
                          ? 'No reports or suggestions submitted yet.' 
                          : `No ${feedbackFilter} reports found.`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        ) : (
          
          /* Tab: Dashboard Analytics */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-cyan-950/20 border border-slate-800/80 p-6 rounded-3xl relative overflow-hidden shadow-2xl backdrop-blur-xl text-left">
                <div className="absolute top-0 right-0 p-5 text-4xl opacity-80">📱</div>
                <p className="text-xs font-bold uppercase text-cyan-400 tracking-wider">Total Scans Recorded</p>
                <h2 className="text-4xl font-black text-white mt-2 tracking-tight">{telemetry?.totalScans || 0}</h2>
                <p className="text-[11px] text-slate-400 mt-1">Unique QR scan events (visitor counts)</p>
              </div>
              <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/20 border border-slate-800/80 p-6 rounded-3xl relative overflow-hidden shadow-2xl backdrop-blur-xl text-left">
                <div className="absolute top-0 right-0 p-5 text-4xl opacity-80">🧭</div>
                <p className="text-xs font-bold uppercase text-emerald-400 tracking-wider">Total Route Navigations</p>
                <h2 className="text-4xl font-black text-emerald-400 mt-2 tracking-tight">{telemetry?.totalNavigations || 0}</h2>
                <p className="text-[11px] text-slate-400 mt-1">Total visitor clicks on walking map routes</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 space-y-4 shadow-xl backdrop-blur-xl text-left">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Infrastructure Status</span>
                  </h3>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Operational</span>
                </div>
                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">🚀</span>
                    <span>Live GPS-enabled mobile positioning engine active.</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">🗺️</span>
                    <span>OpenStreetMap (OSM) tile server &amp; OSRM routing engine active.</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">📍</span>
                    <span>Currently tracking <strong className="text-white">{categories.length} active search categories</strong> in Bodh Gaya.</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">🛡️</span>
                    <span>Connected to MongoDB Atlas high-availability cluster.</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 space-y-4 shadow-xl backdrop-blur-xl text-left">
                <h3 className="text-sm font-extrabold text-white border-b border-slate-800 pb-3">
                  Category Search Requests
                </h3>
                <div className="space-y-4 pt-1">
                  {Object.entries(telemetry?.facilityClicks || {}).map(([catName, clicksCount]) => (
                    <div key={catName}>
                      <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-medium">
                        <span>{catName}</span>
                        <span className="text-white font-bold">{clicksCount} clicks</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800/60">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 shadow-sm"
                          style={{ width: `${Math.min(100, (clicksCount / Math.max(1, telemetry?.totalScans || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {Object.keys(telemetry?.facilityClicks || {}).length === 0 && (
                    <p className="text-xs text-slate-500 py-6 text-center">No category clicks recorded yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Category Form Modal Dialog */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto no-scrollbar bg-slate-950/80 backdrop-blur-md p-4">
          <div className="flex min-h-full items-start justify-center p-2">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 relative shadow-2xl animate-in fade-in duration-200 text-left my-4">
              <h2 className="text-lg font-black text-white mb-1">
                {editingItem ? 'Edit Search Category' : 'Add Search Category'}
              </h2>
              <p className="text-[11px] text-slate-400 mb-4">
                Configure category search keywords, icons, and status for visitors in Bodh Gaya.
              </p>

              {formError && (
                <div className="mb-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs text-center font-bold">
                  {formError}
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label htmlFor="category-name" className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Category Name</label>
                    <input
                      id="category-name"
                      name="categoryName"
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. ATM, Toilet, Food, Temple"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="category-emoji" className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Emoji Icon</label>
                    <input
                      id="category-emoji"
                      name="categoryEmoji"
                      type="text"
                      required
                      value={formEmoji}
                      onChange={(e) => setFormEmoji(e.target.value)}
                      placeholder="e.g. 🛕"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-center text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors text-base"
                    />
                  </div>
                </div>

                {/* Preset Emoji Picker Palette */}
                <div className="space-y-1.5 bg-slate-950/70 border border-slate-850 p-2.5 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Emoji Presets:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {EMOJI_PRESETS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setFormEmoji(em)}
                        className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all cursor-pointer ${
                          formEmoji === em 
                            ? 'bg-emerald-500 text-white scale-110 shadow-md ring-2 ring-emerald-400/40' 
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                        title={`Select ${em}`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="google-keyword" className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Search Keyword (Query)</label>
                    <input
                      id="google-keyword"
                      name="googleKeyword"
                      type="text"
                      required
                      value={formKeyword}
                      onChange={(e) => setFormKeyword(e.target.value)}
                      placeholder="e.g. atm, toilet, temple"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="google-type" className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Place Type (Optional)</label>
                    <input
                      id="google-type"
                      name="googleType"
                      type="text"
                      value={formGoogleType}
                      onChange={(e) => setFormGoogleType(e.target.value)}
                      placeholder="e.g. bank, restaurant"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Category Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    >
                      <option value="Active">Active (Visible on Map)</option>
                      <option value="Inactive">Inactive (Hidden from Map)</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-end gap-2.5 pb-0.5">
                    <button
                      type="button"
                      onClick={closeFormModal}
                      className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700/60 transition-colors focus:outline-none cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formSubmitting}
                      className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 focus:outline-none flex items-center gap-1.5 cursor-pointer"
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
        <div className="fixed inset-0 z-50 overflow-y-auto no-scrollbar bg-slate-950/80 backdrop-blur-md p-4">
          <div className="flex min-h-full items-start justify-center p-2">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-8 relative shadow-2xl animate-in fade-in duration-200 text-left my-4">
              <h2 className="text-xl font-black text-white mb-2">Confirm Deletion</h2>
              <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                Are you sure you want to delete <strong className="text-white">"{itemToDelete?.name}"</strong>? This action will remove this filter category for all visitors.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold border border-slate-700/60 transition-colors focus:outline-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleteSubmitting}
                  className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-bold transition-all shadow-lg shadow-rose-600/25 focus:outline-none flex items-center gap-1.5 cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
