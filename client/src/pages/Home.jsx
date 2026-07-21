import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import api from '../services/api';
import Loading from '../components/Loading';

export default function Home() {
  const placardRef = useRef(null);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await api.get('/locations');
        const list = res.data || [];
        setLocations(list);
        setSelectedLocation(list.length > 0 ? list[0] : { name: 'Kushwaha Haveli', slug: 'kushwaha-haveli' });
      } catch {
        setSelectedLocation({ name: 'Kushwaha Haveli', slug: 'kushwaha-haveli' });
      } finally {
        setLoading(false);
      }
    };
    fetchLocations();
  }, []);

  const downloadQR = async () => {
    if (!placardRef.current || downloading) return;
    setDownloading(true);
    try {
      const btn = placardRef.current.querySelector('.download-btn');
      if (btn) btn.style.display = 'none';
      const canvas = await html2canvas(placardRef.current, { useCORS: true, backgroundColor: '#020617', scale: 2 });
      if (btn) btn.style.display = 'flex';
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${selectedLocation?.slug || 'location'}-qr-placard.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loading message="Preparing venue placards..." />
      </div>
    );
  }

  const locationName = selectedLocation?.name || 'Kushwaha Haveli';
  const locationSlug = selectedLocation?.slug || 'kushwaha-haveli';
  const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
  const qrTargetUrl = `${window.location.origin}/location/${locationSlug}`;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-10 px-4 animate-fade-slide-up">

      {/* ── Page Hero ── */}
      <div className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[11px] font-bold uppercase tracking-widest mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          QR Navigation System
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
          Venue Location Placards
        </h1>
        <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
          Print and deploy QR placard signs at each venue gate for visitor navigation.
        </p>
      </div>

      {/* ── Location Tabs (if multiple) ── */}
      {locations.length > 1 && (
        <div className="w-full max-w-sm mb-6">
          <div className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-sm">
            {locations.map((loc) => {
              const isActive = selectedLocation?.slug === loc.slug;
              return (
                <button
                  key={loc.slug || loc._id}
                  onClick={() => setSelectedLocation(loc)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer truncate ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {loc.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── QR Placard Card ── */}
      <div
        ref={placardRef}
        className="relative w-full max-w-[360px] rounded-[28px] overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0f172a 0%, #020617 100%)',
          boxShadow: '0 0 0 1px rgba(30,41,59,0.8), 0 25px 60px rgba(0,0,0,0.6), 0 0 80px -20px rgba(16,185,129,0.12)'
        }}
      >
        {/* Glow accents */}
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-indigo-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-7 space-y-6 text-center">

          {/* Header badge */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Scan &amp; Navigate
            </div>
            <h2 className="text-lg font-black text-white">{locationName}</h2>
            <p className="text-[11px] text-slate-500">Event Navigation System</p>
          </div>

          {/* QR Code frame */}
          <div className="relative w-56 h-56 mx-auto">
            {/* Scanner crosshairs */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <div className="absolute top-2.5 left-2.5 w-5 h-5 border-t-2 border-l-2 border-emerald-400 rounded-tl-md" />
              <div className="absolute top-2.5 right-2.5 w-5 h-5 border-t-2 border-r-2 border-emerald-400 rounded-tr-md" />
              <div className="absolute bottom-2.5 left-2.5 w-5 h-5 border-b-2 border-l-2 border-emerald-400 rounded-bl-md" />
              <div className="absolute bottom-2.5 right-2.5 w-5 h-5 border-b-2 border-r-2 border-emerald-400 rounded-br-md" />
            </div>

            {/* Scan line animation */}
            <div
              className="absolute left-3 right-3 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-70 z-10"
              style={{ animation: 'scanLine 2.5s ease-in-out infinite', top: '8px' }}
            />

            {/* QR image */}
            <div className="w-full h-full bg-white rounded-2xl p-3 flex items-center justify-center shadow-lg">
              <img
                src={`${apiBase}/qrcodes/${locationSlug}-access-qr.png`}
                alt={`${locationName} QR Code`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrTargetUrl)}`;
                }}
              />
            </div>
          </div>

          {/* CTA text */}
          <div className="space-y-1">
            <p className="text-sm font-bold text-white">📍 You Are Here</p>
            <p className="text-xs text-slate-400 leading-relaxed px-2">
              Scan to check coordinates and find nearest medical, security &amp; facilities.
            </p>
          </div>

          {/* Download button */}
          <button
            onClick={downloadQR}
            disabled={downloading}
            className="download-btn w-full flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-sm font-bold text-white cursor-pointer transition-all duration-200 disabled:opacity-60 disabled:cursor-wait"
            style={{
              background: downloading
                ? 'rgba(16,185,129,0.4)'
                : 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
              boxShadow: '0 4px 20px rgba(16,185,129,0.25)'
            }}
          >
            {downloading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeLinecap="round" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Print Placard
              </>
            )}
          </button>

          {/* Footer tag */}
          <div className="pt-1 border-t border-slate-800/60 text-[10px] text-slate-600 flex items-center justify-center gap-1">
            Developed by
            <a href="https://confluxaa.com" target="_blank" rel="noopener noreferrer" className="font-black text-slate-400 hover:text-emerald-400 transition-colors ml-0.5">
              Confluxaa
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
