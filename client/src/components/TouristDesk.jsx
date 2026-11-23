import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import Loading from './Loading';
import { useTranslation } from '../context/LanguageContext';

const COUNTRIES = [
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'TH', name: 'Thailand', dial: '+66', flag: '🇹🇭' },
  { code: 'LK', name: 'Sri Lanka', dial: '+94', flag: '🇱🇰' },
  { code: 'MM', name: 'Myanmar', dial: '+95', flag: '🇲🇲' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { code: 'VN', name: 'Vietnam', dial: '+84', flag: '🇻🇳' },
  { code: 'BT', name: 'Bhutan', dial: '+975', flag: '🇧🇹' },
  { code: 'NP', name: 'Nepal', dial: '+977', flag: '🇳🇵' },
  { code: 'KH', name: 'Cambodia', dial: '+855', flag: '🇰🇭' },
  { code: 'KR', name: 'South Korea', dial: '+82', flag: '🇰🇷' },
  { code: 'TW', name: 'Taiwan', dial: '+886', flag: '🇹🇼' },
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
  { code: 'OTHER', name: 'Other Country', dial: '+91', flag: '🌍' }
];

export function buildWhatsAppMessage(tourist, passId) {
  const isGroup = tourist.type === 'group';
  const memberCountText = isGroup
    ? `समूह (Group - ${tourist.totalMembers || 1} सदस्य)`
    : 'व्यक्तिगत (Individual - 1 व्यक्ति)';

  const dateStr = new Date(tourist.createdAt || Date.now()).toLocaleDateString('hi-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

  return `🙏 *नमो बुद्धाय | WELCOME TO BODH GAYA* 🙏
*नगर परिषद बोधगया — आधिकारिक डिजिटल पर्यटक पास*
━━━━━━━━━━━━━━━━━━━━━━━━━━

🎫 *पंजीकरण / पास ID:* ${passId || tourist.registrationNo}
👤 *पर्यटक का नाम:* ${tourist.fullName}
👥 *पंजीकरण प्रकार:* ${memberCountText}
📞 *पंजीकृत मोबाइल:* ${tourist.countryCode || '+91'} ${tourist.phone}
🚨 *इमरजेंसी संपर्क:* ${tourist.emergencyContact?.name ? tourist.emergencyContact.name + ' (' + (tourist.emergencyContact.relation || 'Relative') + '): ' : ''}${tourist.emergencyContact?.phone || 'N/A'}
🌍 *देश / पता:* ${tourist.country || 'India'} (${tourist.city || tourist.address || 'Bodh Gaya'})
📅 *पंजीकरण दिनांक:* ${dateStr}

━━━━━━━━━━━━━━━━━━━━━━━━━━
🗺️ *बोधगया डिजिटल गाइड एवं लाइव नेविगेशन:*
👉 ${appOrigin}/map
(महाबोधि मंदिर, सुजाता कुटी, 80 फीट बुद्ध, सभी प्रमुख विदेशी मोनेस्ट्री, स्वच्छ पेयजल, टॉयलेट, चिकित्सा बूथ)

🚨 *24x7 बोधगया आपातकालीन सहायता केंद्र:*
• आपातकालीन पुलिस नियंत्रण कक्ष: 112
• महाबोधि मंदिर कंट्रोल रूम: 0631-2200735
• एम्बुलेंस / मेडिकल सहायता: 108
• पर्यटक पुलिस सहायता केंद्र: 0631-2200424

━━━━━━━━━━━━━━━━━━━━━━━━━━
🌸 *भगवान बुद्ध की पावन ज्ञानस्थली में आपकी यात्रा सुखद, सुरक्षित एवं मंगलमय हो!*
🏛️ _प्रशासन — नगर परिषद बोधगया (पर्यटन एवं तीर्थयात्री सहायता डेस्क)_`;
}

export default function TouristDesk() {
  const { t } = useTranslation();
  const [tourists, setTourists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'individual' | 'group'

  // Modal States
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [selectedTourist, setSelectedTourist] = useState(null);
  const [passQrCodeUrl, setPassQrCodeUrl] = useState('');

  // Form Registration State
  const [regType, setRegType] = useState('individual'); // 'individual' | 'group'
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('Family');
  const [idCardType, setIdCardType] = useState('Aadhaar');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('India');
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState([]);

  // File Upload States
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [idFile, setIdFile] = useState(null);
  const [idPreview, setIdPreview] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const fileInputPhotoRef = useRef(null);
  const fileInputIdRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Tourists List
  const fetchTourists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/tourists', {
        params: {
          search: searchQuery,
          type: typeFilter
        }
      });
      const list = Array.isArray(response?.data) ? response.data : [];
      setTourists(list);
    } catch (err) {
      console.error('Failed to load tourists:', err);
      setError(err.message || 'Failed to fetch registered tourists.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter]);

  useEffect(() => {
    fetchTourists();
  }, [fetchTourists]);

  // Handle Photo Select
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('कृपया केवल इमेज (JPG, PNG, WebP) फ़ाइल चुनें।');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Handle ID Card Select
  const handleIdChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('कृपया केवल इमेज (JPG, PNG, WebP) फ़ाइल चुनें।');
        return;
      }
      setIdFile(file);
      setIdPreview(URL.createObjectURL(file));
    }
  };

  // Group Members Add / Remove
  const handleAddMember = () => {
    setGroupMembers([
      ...groupMembers,
      { name: '', age: '', gender: 'Male', relation: 'Member' }
    ]);
  };

  const handleMemberChange = (index, field, value) => {
    const updated = [...groupMembers];
    updated[index][field] = value;
    setGroupMembers(updated);
  };

  const handleRemoveMember = (index) => {
    const updated = groupMembers.filter((_, i) => i !== index);
    setGroupMembers(updated);
  };

  // Country Change Handler: automatically sets dialing code
  const handleCountryChange = (cName) => {
    setSelectedCountry(cName);
    const found = COUNTRIES.find(c => c.name === cName);
    if (found && found.dial !== '+') {
      setCountryCode(found.dial);
    }
  };

  // Reset Form
  const resetForm = () => {
    setRegType('individual');
    setFullName('');
    setPhone('');
    setCountryCode('+91');
    setEmergencyName('');
    setEmergencyPhone('');
    setEmergencyRelation('Family');
    setIdCardType('Aadhaar');
    setIdCardNumber('');
    setAddress('');
    setCity('');
    setStateName('');
    setSelectedCountry('India');
    setGroupName('');
    setGroupMembers([]);
    setPhotoFile(null);
    setPhotoPreview(null);
    setIdFile(null);
    setIdPreview(null);
    setFormError(null);
  };

  // Submit Registration Form
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !emergencyPhone.trim() || !address.trim()) {
      setFormError('कृपया सभी अनिवार्य फ़ील्ड्स (नाम, फोन, आपातकालीन संपर्क और पता) भरें।');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const formData = new FormData();
      formData.append('type', regType);
      formData.append('fullName', fullName.trim());
      formData.append('phone', phone.trim());
      formData.append('countryCode', countryCode);
      formData.append('emergencyContactName', emergencyName.trim());
      formData.append('emergencyContactPhone', emergencyPhone.trim());
      formData.append('emergencyContactRelation', emergencyRelation.trim());
      formData.append('idCardType', idCardType);
      formData.append('idCardNumber', idCardNumber.trim());
      formData.append('address', address.trim());
      formData.append('city', city.trim());
      formData.append('state', stateName.trim());
      formData.append('country', selectedCountry);
      formData.append('groupName', groupName.trim());
      formData.append('totalMembers', regType === 'group' ? groupMembers.length + 1 : 1);
      formData.append('members', JSON.stringify(groupMembers));

      if (photoFile) {
        formData.append('photo', photoFile);
      }
      if (idFile) {
        formData.append('idCardPhoto', idFile);
      }

      const response = await api.post('/tourists/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response && response.success) {
        const savedData = response.data;
        const qrUrl = response.qrCodeDataUrl;

        setIsRegisterModalOpen(false);
        resetForm();
        fetchTourists();

        // Open Digital Pass & WhatsApp Dispatcher Modal
        setSelectedTourist(savedData);
        setPassQrCodeUrl(qrUrl);
        setIsPassModalOpen(true);
        showToast('✓ पर्यटक सफलतापूर्वक पंजीकृत! पास आईडी तैयार है।');
      }
    } catch (err) {
      console.error('Registration failed:', err);
      setFormError(err.message || 'पंजीकरण विफल रहा। कृपया पुनः प्रयास करें।');
    } finally {
      setSubmitting(false);
    }
  };

  // Open WhatsApp Web with formatted message
  const handleOpenWhatsAppWeb = (tourist) => {
    if (!tourist) return;
    const cleanPhone = tourist.phone.replace(/[^0-9]/g, '');
    const code = (tourist.countryCode || '+91').replace(/[^0-9]/g, '');
    // Ensure international format
    let targetPhone = cleanPhone;
    if (!cleanPhone.startsWith(code)) {
      targetPhone = `${code}${cleanPhone}`;
    }

    const message = buildWhatsAppMessage(tourist, tourist.registrationNo);
    const encoded = encodeURIComponent(message);
    const whatsappWebUrl = `https://web.whatsapp.com/send?phone=${targetPhone}&text=${encoded}`;

    window.open(whatsappWebUrl, '_blank');
    showToast('📲 WhatsApp Web खुल रहा है...');
  };

  // Copy WhatsApp message to clipboard
  const handleCopyMessage = (tourist) => {
    if (!tourist) return;
    const message = buildWhatsAppMessage(tourist, tourist.registrationNo);
    navigator.clipboard.writeText(message);
    showToast('📋 WhatsApp संदेश क्लिपबोर्ड पर कॉपी हो गया!');
  };

  // Delete Tourist
  const handleDeleteTourist = async (id, regNo) => {
    if (!window.confirm(`क्या आप पंजीकरण पास ${regNo} को सच में हटाना चाहते हैं?`)) return;
    try {
      await api.delete(`/tourists/${id}`);
      setTourists(prev => prev.filter(t => t._id !== id));
      showToast(`✓ पास ${regNo} हटा दिया गया।`);
    } catch (err) {
      alert(err.message || 'हटाने में त्रुटि आई।');
    }
  };

  // Print Pass Card
  const handlePrintPass = () => {
    window.print();
  };

  const safeTourists = Array.isArray(tourists) ? tourists : [];
  const filteredTourists = safeTourists.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.registrationNo?.toLowerCase().includes(q) ||
      t.fullName?.toLowerCase().includes(q) ||
      t.phone?.includes(q) ||
      t.country?.toLowerCase().includes(q) ||
      t.groupName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-2 animate-bounce">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Action Bar & Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl font-black">
            👥
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">{t('totalRegistrations')}</div>
            <div className="text-xl font-black text-white font-mono">{safeTourists.length}</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center text-2xl font-black">
            👤
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">{t('individual')}</div>
            <div className="text-xl font-black text-white font-mono">
              {safeTourists.filter(t => t.type === 'individual').length}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-2xl font-black">
            🏛️
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">{t('group')}</div>
            <div className="text-xl font-black text-white font-mono">
              {safeTourists.filter(t => t.type === 'group').length}
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <button
            onClick={() => {
              resetForm();
              setIsRegisterModalOpen(true);
            }}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm md:text-base transition-all shadow-xl shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="text-xl">➕</span>
            <span>{t('newTouristRegistration')}</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchTouristPlaceholder')}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            {t('allTourists')} ({safeTourists.length})
          </button>
          <button
            onClick={() => setTypeFilter('individual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              typeFilter === 'individual'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            👤 {t('individual')}
          </button>
          <button
            onClick={() => setTypeFilter('group')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              typeFilter === 'group'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            👥 {t('group')}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-center text-xs text-rose-400 font-bold">
          {error}
        </div>
      )}

      {/* Tourist Records Table */}
      {loading ? (
        <div className="h-48 flex items-center justify-center bg-slate-900/60 border border-slate-800 rounded-2xl">
          <Loading message={t('loadingTouristData')} />
        </div>
      ) : filteredTourists.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-400">
          <div className="text-4xl mb-2">📭</div>
          <div className="text-sm font-bold text-slate-300">{t('noRegistrations')}</div>
          <p className="text-xs text-slate-500 mt-1">
            {t('clickNewRegistration')}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 text-[11px] font-black uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">{t('passIdDate')}</th>
                  <th className="py-3 px-4">{t('touristNamePhoto')}</th>
                  <th className="py-3 px-4">{t('regType')}</th>
                  <th className="py-3 px-4">{t('mobileWhatsApp')}</th>
                  <th className="py-3 px-4">{t('emergencyContact')}</th>
                  <th className="py-3 px-4">{t('countryAddress')}</th>
                  <th className="py-3 px-4 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTourists.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Pass ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                      <div>{item.registrationNo}</div>
                      <div className="text-[10px] text-slate-500 font-sans font-normal">
                        {new Date(item.createdAt).toLocaleDateString('hi-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </td>

                    {/* Name & Photo */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                          {item.photoUrl ? (
                            <img
                              src={item.photoUrl}
                              alt={item.fullName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-base">👤</span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white">{item.fullName}</div>
                          {item.type === 'group' && item.groupName && (
                            <div className="text-[11px] text-purple-400">
                              {item.groupName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4">
                      {item.type === 'group' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          <span>👥 समूह ({item.totalMembers || 1})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                          <span>👤 1 व्यक्ति</span>
                        </span>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-slate-200">
                        {item.countryCode} {item.phone}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-medium">WhatsApp Active</div>
                    </td>

                    {/* Emergency Contact */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-300 text-xs">
                        {item.emergencyContact?.name || 'Emergency'}
                        {item.emergencyContact?.relation ? ` (${item.emergencyContact.relation})` : ''}
                      </div>
                      <div className="font-mono text-slate-400 text-xs">
                        {item.emergencyContact?.phone}
                      </div>
                    </td>

                    {/* Country & Address */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-200 flex items-center gap-1.5">
                        <span>{item.country}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[140px]" title={item.address}>
                        {item.city ? `${item.city}, ` : ''}{item.address}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* WhatsApp Web Button */}
                        <button
                          onClick={() => handleOpenWhatsAppWeb(item)}
                          className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer"
                          title={t('sendWhatsApp')}
                        >
                          <span className="text-sm">📲</span>
                        </button>

                        {/* View Pass Card */}
                        <button
                          onClick={async () => {
                            setSelectedTourist(item);
                            try {
                              const res = await api.get(`/tourists/${item._id}`);
                              setPassQrCodeUrl(res.qrCodeDataUrl || '');
                            } catch {
                              setPassQrCodeUrl('');
                            }
                            setIsPassModalOpen(true);
                          }}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition-all cursor-pointer"
                          title={t('viewPassBadge')}
                        >
                          <span className="text-sm">🪪</span>
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteTourist(item._id, item.registrationNo)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                          title={t('deleteTouristRecord')}
                        >
                          <span className="text-sm">🗑️</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ➕ REGISTRATION MODAL (Individual / Group with Cloudinary Upload) */}
      {/* ============================================================== */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-6">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-900 border-b border-slate-800 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl font-black">
                  🪪
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {t('regModalTitle')}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cloudinary Secure Storage • Instant WhatsApp Dispatch
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRegisterSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-400 font-medium">
                  {formError}
                </div>
              )}

              {/* Mode Toggle: Individual vs Group */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  {t('regTypeSelect')} *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRegType('individual')}
                    className={`py-3 px-4 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      regType === 'individual'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>👤</span>
                    <span>{t('singleTourist')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegType('group')}
                    className={`py-3 px-4 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      regType === 'group'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-md shadow-purple-500/10'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>👥</span>
                    <span>{t('groupDelegation')}</span>
                  </button>
                </div>
              </div>

              {/* Group Name (If Group) */}
              {regType === 'group' && (
                <div className="bg-purple-950/30 border border-purple-800/50 rounded-2xl p-4 space-y-3">
                  <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <span>🏛️</span>
                    <span>{t('groupDelegation')}</span>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      {t('groupName')}
                    </label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder={t('groupNamePlaceholder')}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* Primary Personal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t('fullName')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t('fullNamePlaceholder')}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Country Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t('country')} *
                  </label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.name}>
                        {c.flag} {c.name} ({c.dial})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mobile / WhatsApp & Emergency Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t('mobileNumber')} *
                  </label>
                  <div className="flex gap-2">
                    <span className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-400 font-mono flex items-center">
                      {countryCode}
                    </span>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t('mobilePlaceholder')}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t('emergencyPhone')} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder={t('emergencyPhonePlaceholder')}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Emergency Contact Name & Relation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    आपातकालीन व्यक्ति का नाम (Emergency Contact Name)
                  </label>
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="उदा: सुधीर सिंह (पिता / टूर गाइड)"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    संबंध (Relation)
                  </label>
                  <select
                    value={emergencyRelation}
                    onChange={(e) => setEmergencyRelation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Family">परिवार (Family / Relative)</option>
                    <option value="Parent">माता / पिता (Parent)</option>
                    <option value="Spouse">पति / पत्नी (Spouse)</option>
                    <option value="Friend">मित्र (Friend)</option>
                    <option value="Tour Guide">टूर गाइड (Tour Guide)</option>
                    <option value="Embassy">दूतावास (Embassy)</option>
                  </select>
                </div>
              </div>

              {/* Photo & ID Card Upload Section */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="text-xs font-bold text-amber-400 flex items-center justify-between">
                  <span>📸 फोटो एवं पहचान पत्र (Photo & ID Card Upload)</span>
                  <span className="text-[10px] text-slate-500 font-normal">Cloudinary Secure Storage</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Photo Upload */}
                  <div>
                    <label className="block text-xs text-slate-300 mb-1 font-medium">
                      पर्यटक की फोटो (Tourist Photo)
                    </label>
                    <input
                      type="file"
                      ref={fileInputPhotoRef}
                      onChange={handlePhotoChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputPhotoRef.current?.click()}
                      className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl p-4 text-center cursor-pointer transition-all bg-slate-900/50 flex flex-col items-center justify-center min-h-[110px]"
                    >
                      {photoPreview ? (
                        <div className="relative">
                          <img
                            src={photoPreview}
                            alt="Preview"
                            className="w-20 h-20 object-cover rounded-xl border border-amber-500/40"
                          />
                          <span className="text-[10px] text-emerald-400 block mt-1">✓ फोटो चुनी गई</span>
                        </div>
                      ) : (
                        <>
                          <span className="text-2xl mb-1">📷</span>
                          <span className="text-xs text-slate-400">फोटो चुनें या कैप्चर करें</span>
                          <span className="text-[10px] text-slate-500">JPG, PNG (Max 10MB)</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ID Card Document Upload */}
                  <div>
                    <label className="block text-xs text-slate-300 mb-1 font-medium">
                      आईडी कार्ड फोटो / स्कैन (ID Card Document)
                    </label>
                    <input
                      type="file"
                      ref={fileInputIdRef}
                      onChange={handleIdChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputIdRef.current?.click()}
                      className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl p-4 text-center cursor-pointer transition-all bg-slate-900/50 flex flex-col items-center justify-center min-h-[110px]"
                    >
                      {idPreview ? (
                        <div className="relative">
                          <img
                            src={idPreview}
                            alt="ID Preview"
                            className="w-20 h-20 object-cover rounded-xl border border-amber-500/40"
                          />
                          <span className="text-[10px] text-emerald-400 block mt-1">✓ आईडी डॉक्युमेंट चुना गया</span>
                        </div>
                      ) : (
                        <>
                          <span className="text-2xl mb-1">🪪</span>
                          <span className="text-xs text-slate-400">पहचान पत्र फोटो चुनें</span>
                          <span className="text-[10px] text-slate-500">Aadhaar, Passport, etc.</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* ID Type & Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      पहचान पत्र प्रकार (ID Proof Type)
                    </label>
                    <select
                      value={idCardType}
                      onChange={(e) => setIdCardType(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Aadhaar">आधार कार्ड (Aadhaar Card)</option>
                      <option value="Passport">पासपोर्ट (Passport)</option>
                      <option value="Voter ID">मतदाता पहचान पत्र (Voter ID)</option>
                      <option value="Driving License">ड्राइविंग लाइसेंस (Driving License)</option>
                      <option value="National ID">राष्ट्रीय पहचान पत्र (National ID)</option>
                      <option value="Other">अन्य (Other)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      पहचान पत्र संख्या (ID Number)
                    </label>
                    <input
                      type="text"
                      value={idCardNumber}
                      onChange={(e) => setIdCardNumber(e.target.value)}
                      placeholder="उदा: 1234 5678 9012"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Address Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    स्थायी पता (Permanent Address) *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="मकान संख्या, मोहल्ला/मार्ग, शहर..."
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">शहर (City)</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="उदा: पटना / Bangkok"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">राज्य / प्रांत (State)</label>
                    <input
                      type="text"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      placeholder="उदा: बिहार / Central Province"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Group Members List (If Group Mode) */}
              {regType === 'group' && (
                <div className="bg-slate-950/70 border border-purple-800/40 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-purple-300">
                        समूह के अन्य सदस्य (Group Members List)
                      </div>
                      <div className="text-[10px] text-slate-400">
                        मुख्य लीडर के अलावा साथ आए सदस्यों का विवरण
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddMember}
                      className="py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>＋ सदस्य जोड़ें</span>
                    </button>
                  </div>

                  {groupMembers.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-500">
                      कोई अतिरिक्त सदस्य नहीं जोड़ा गया। "＋ सदस्य जोड़ें" पर क्लिक करें।
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {groupMembers.map((m, idx) => (
                        <div
                          key={idx}
                          className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-xs"
                        >
                          <span className="text-slate-500 font-mono w-5 shrink-0">#{idx + 1}</span>
                          <input
                            type="text"
                            required
                            placeholder="सदस्य का नाम"
                            value={m.name}
                            onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                            className="flex-1 min-w-[120px] px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                          />
                          <input
                            type="number"
                            placeholder="उम्र"
                            value={m.age}
                            onChange={(e) => handleMemberChange(idx, 'age', e.target.value)}
                            className="w-16 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                          />
                          <select
                            value={m.gender}
                            onChange={(e) => handleMemberChange(idx, 'gender', e.target.value)}
                            className="w-20 px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                          >
                            <option value="Male">पुरुष</option>
                            <option value="Female">महिला</option>
                            <option value="Other">अन्य</option>
                          </select>
                          <input
                            type="text"
                            placeholder="संबंध (जैसे पत्नी, पुत्र)"
                            value={m.relation}
                            onChange={(e) => handleMemberChange(idx, 'relation', e.target.value)}
                            className="w-24 px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(idx)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20"
                            title="सदस्य हटाएं"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold transition-all cursor-pointer"
                >
                  {t('cancel')}
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>{t('submitting')}</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>{t('createAndIssuePass')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🪪 DIGITAL PASS & WHATSAPP DISPATCHER MODAL */}
      {/* ============================================================== */}
      {isPassModalOpen && selectedTourist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden my-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-4 text-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🙏</span>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider">
                    नगर परिषद बोधगया — डिजिटल पर्यटक पास
                  </h3>
                  <div className="text-[10px] font-bold opacity-90">
                    Bodh Gaya Official Pilgrim & Tourist Entry Pass
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsPassModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 font-bold flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Pass Card Preview (Printable Area) */}
              <div
                id="printable-tourist-pass"
                className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/40 rounded-2xl p-5 shadow-2xl relative overflow-hidden"
              >
                {/* Decorative Buddhist Wheel Motif */}
                <div className="absolute -right-8 -bottom-8 text-amber-500/5 text-9xl pointer-events-none select-none font-serif">
                  ☸
                </div>

                {/* Card Top Branding */}
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">☸️</span>
                    <div>
                      <div className="text-xs font-black text-amber-400 uppercase tracking-widest">
                        BODH GAYA TOURIST PASS
                      </div>
                      <div className="text-[9px] text-slate-400">
                        Administered by Nagar Parishad Bodh Gaya
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Pass ID</div>
                    <div className="text-sm font-black font-mono text-amber-400">
                      {selectedTourist.registrationNo}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="grid grid-cols-3 gap-4 items-center">
                  {/* Photo */}
                  <div className="col-span-1 flex flex-col items-center">
                    <div className="w-24 h-28 rounded-xl bg-slate-800 border-2 border-amber-500/40 overflow-hidden shadow-lg flex items-center justify-center">
                      {selectedTourist.photoUrl ? (
                        <img
                          src={selectedTourist.photoUrl}
                          alt={selectedTourist.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl">👤</span>
                      )}
                    </div>
                    <span className="mt-1.5 text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase">
                      VERIFIED PASS
                    </span>
                  </div>

                  {/* Details */}
                  <div className="col-span-2 space-y-1.5 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">नाम / Full Name:</span>
                      <span className="text-white font-black text-sm">{selectedTourist.fullName}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 text-[10px] block">प्रकार / Type:</span>
                        <span className="text-amber-300 font-bold">
                          {selectedTourist.type === 'group'
                            ? `समूह (${selectedTourist.totalMembers || 1})`
                            : 'व्यक्तिगत (1)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">देश / Country:</span>
                        <span className="text-white font-bold">{selectedTourist.country || 'India'}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block">व्हाट्सएप संपर्क / Mobile:</span>
                      <span className="text-slate-200 font-mono">
                        {selectedTourist.countryCode} {selectedTourist.phone}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block">आपातकालीन संपर्क / Emergency:</span>
                      <span className="text-rose-300 font-mono font-bold">
                        {selectedTourist.emergencyContact?.phone}
                      </span>
                    </div>
                  </div>
                </div>

                {/* QR Code & Verification Footer */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold">आपातकालीन हेल्पलाइन:</div>
                    <div className="text-[9px] text-slate-300">
                      पुलिस: 112 | मंदिर कंट्रोल: 0631-2200735 | एम्बुलेंस: 108
                    </div>
                  </div>

                  {passQrCodeUrl && (
                    <div className="w-16 h-16 bg-white p-1 rounded-xl shrink-0 shadow-md">
                      <img src={passQrCodeUrl} alt="Pass QR" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: WhatsApp & Print */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleOpenWhatsAppWeb(selectedTourist)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm md:text-base shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span className="text-2xl">📲</span>
                  <span>{t('shareViaWhatsApp')}</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleCopyMessage(selectedTourist)}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>📋</span>
                    <span>Copy Message</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintPass}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 text-xs font-bold transition-all border border-amber-500/30 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>🖨️</span>
                    <span>{t('printPass')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
