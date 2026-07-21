import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import api from '../services/api';
import Loading from '../components/Loading';

export default function Home() {
  const placardRef = useRef(null);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await api.get('/locations');
        const list = res.data || [];
        setLocations(list);
        if (list.length > 0) {
          setSelectedLocation(list[0]);
        } else {
          // Fallback if DB is empty
          setSelectedLocation({ name: 'Kushwaha Haveli', slug: 'kushwaha-haveli' });
        }
      } catch (err) {
        console.warn('Failed to fetch locations, using fallback:', err);
        setSelectedLocation({ name: 'Kushwaha Haveli', slug: 'kushwaha-haveli' });
      } finally {
        setLoading(false);
      }
    };
    fetchLocations();
  }, []);

  const downloadQR = async () => {
    if (!placardRef.current) return;
    try {
      const btn = placardRef.current.querySelector('.download-btn');
      if (btn) btn.style.display = 'none';

      const canvas = await html2canvas(placardRef.current, {
        useCORS: true,
        backgroundColor: '#020617',
        scale: 2
      });

      if (btn) btn.style.display = 'block';

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${selectedLocation?.slug || 'location'}-placard.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to capture placard:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loading message="Loading venue location placards..." />
      </div>
    );
  }

  const locationName = selectedLocation?.name || 'Kushwaha Haveli';
  const locationSlug = selectedLocation?.slug || 'kushwaha-haveli';
  const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
  const qrTargetUrl = `${window.location.origin}/location/${locationSlug}`;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-8 px-4 space-y-6">
      
      {/* Location Selector (If multiple locations exist) */}
      {locations.length > 1 && (
        <div className="w-full max-w-sm bg-slate-900/90 border border-slate-800 rounded-2xl p-2 flex items-center gap-2 overflow-x-auto shadow-lg backdrop-blur-md">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 px-2 shrink-0">
            Select Location:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {locations.map((loc) => {
              const isSelected = selectedLocation?.slug === loc.slug;
              return (
                <button
                  key={loc.slug || loc._id}
                  onClick={() => setSelectedLocation(loc)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  📍 {loc.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Premium Genuine QR Placard Frame */}
      <div 
        ref={placardRef}
        className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-[32px] p-6 shadow-2xl space-y-6 text-center overflow-hidden"
      >
        
        {/* Dynamic Glow Accents */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
        
        {/* Top Header Badge */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Scan & Navigate
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">{locationName}</h2>
          <p className="text-xs text-slate-400">Event Navigation System</p>
        </div>

        {/* QR Code Container with Scanner Frame */}
        <div className="relative w-64 h-64 mx-auto bg-slate-950 rounded-3xl p-5 border border-slate-800 flex items-center justify-center group shadow-inner">
          
          {/* Scanner Corner Crosshairs */}
          <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl" />
          <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr" />
          <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl" />
          <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br" />

          {/* Genuine QR Code Image */}
          <div className="w-full h-full bg-white rounded-2xl p-3 flex items-center justify-center overflow-hidden shadow-md">
            <img 
              src={`${apiBase}/qrcodes/${locationSlug}-access-qr.png`} 
              alt="Location Access QR" 
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.src = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + encodeURIComponent(qrTargetUrl);
              }}
            />
          </div>
        </div>

        {/* Scan Message Call to Action */}
        <div className="space-y-1.5">
          <p className="text-sm font-extrabold text-white">📍 You Are Here</p>
          <p className="text-xs text-slate-400 px-4 leading-relaxed">
            Scan with your mobile phone to check current coordinates and walk routes to nearest clinics.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={downloadQR}
          className="download-btn w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-emerald-900/30 focus:outline-none cursor-pointer"
        >
          Download Print File ({locationSlug})
        </button>

        {/* Developer Tag inside Placard */}
        <div className="pt-2 border-t border-slate-900 text-[10px] text-slate-600 font-mono flex items-center justify-center gap-1">
          <span>Developed by</span>
          <a 
            href="https://confluxaa.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="font-black text-slate-400 hover:text-emerald-400 transition-colors"
          >
            Confluxaa
          </a>
        </div>

      </div>
    </div>
  );
}


