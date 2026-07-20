import React, { useRef } from 'react';
import html2canvas from 'html2canvas';

export default function Home() {
  const placardRef = useRef(null);

  const downloadQR = async () => {
    if (!placardRef.current) return;
    try {
      // Temporarily hide the download button during capture so it doesn't show in the image
      const btn = placardRef.current.querySelector('.download-btn');
      if (btn) btn.style.display = 'none';

      const canvas = await html2canvas(placardRef.current, {
        useCORS: true,
        backgroundColor: '#020617', // dark slate background matching tailwind style
        scale: 2 // double scale for crisp print quality
      });

      if (btn) btn.style.display = 'block';

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'main-gate-placard.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to capture placard:', err);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-8 px-4">
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
          <h2 className="text-xl font-black text-white tracking-tight">Main Gate Access</h2>
          <p className="text-xs text-slate-400">Campus Location System</p>
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
              src={`${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api$/, '')}/qrcodes/main-gate-access-qr.png`} 
              alt="Location Access QR" 
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.src = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + encodeURIComponent(window.location.origin + "/location/main-gate");
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
          Download Print File
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


