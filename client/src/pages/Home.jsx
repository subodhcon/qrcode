import React, { useState } from 'react';
import Loading from '../components/Loading';

export default function Home() {
  const [downloading, setDownloading] = useState(false);

  // Pure Canvas download — no html2canvas CORS issues
  const downloadQR = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const slug = 'event-map';
      const name = 'Event Navigator';
      const qrTargetUrl = `${window.location.origin}/`;
      const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrTargetUrl)}`;

      // Fetch QR as blob to avoid canvas taint
      const loadImg = (url) =>
        fetch(url)
          .then((r) => { if (!r.ok) throw new Error(); return r.blob(); })
          .then((blob) => new Promise((res, rej) => {
            const img = new Image();
            img.onload  = () => res(img);
            img.onerror = rej;
            img.src = URL.createObjectURL(blob);
          }));

      const qrImg = await loadImg(fallbackUrl);

      // Canvas dimensions @2x for crisp print quality
      const W = 720, H = 1040, R = 40;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');

      const rr = (x, y, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
        ctx.quadraticCurveTo(x+w,y,x+w,y+r);
        ctx.lineTo(x+w,y+h-r);
        ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
        ctx.lineTo(x+r,y+h);
        ctx.quadraticCurveTo(x,y+h,x,y+h-r);
        ctx.lineTo(x,y+r);
        ctx.quadraticCurveTo(x,y,x+r,y);
        ctx.closePath();
      };

      // Background
      const bg = ctx.createLinearGradient(0,0,0,H);
      bg.addColorStop(0,'#0f172a'); bg.addColorStop(1,'#020617');
      rr(0,0,W,H,R); ctx.fillStyle=bg; ctx.fill();
      rr(0,0,W,H,R); ctx.strokeStyle='rgba(30,41,59,0.8)'; ctx.lineWidth=2; ctx.stroke();

      // Glow
      const g=ctx.createRadialGradient(80,80,0,80,80,200);
      g.addColorStop(0,'rgba(16,185,129,0.1)'); g.addColorStop(1,'transparent');
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

      // Badge pill
      const bW=260,bH=40,bX=(W-bW)/2,bY=56;
      rr(bX,bY,bW,bH,20); ctx.fillStyle='rgba(16,185,129,0.1)'; ctx.fill();
      rr(bX,bY,bW,bH,20); ctx.strokeStyle='rgba(16,185,129,0.25)'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(bX+22,bY+20,5,0,Math.PI*2);
      ctx.fillStyle='#10b981'; ctx.fill();
      ctx.font='bold 17px Arial,sans-serif'; ctx.fillStyle='#10b981';
      ctx.textAlign='center'; ctx.fillText('SCAN & NAVIGATE', W/2+6, bY+27);

      // Location name
      ctx.font='bold 44px Arial,sans-serif'; ctx.fillStyle='#ffffff';
      ctx.fillText(name, W/2, 168);

      // Subtitle
      ctx.font='22px Arial,sans-serif'; ctx.fillStyle='#64748b';
      ctx.fillText('Event Navigation System', W/2, 208);

      // QR white box
      const qS=420, qX=(W-qS)/2, qY=240, qP=22;
      rr(qX,qY,qS,qS,20); ctx.fillStyle='#ffffff'; ctx.fill();
      ctx.drawImage(qrImg, qX+qP, qY+qP, qS-qP*2, qS-qP*2);

      // Scanner corners
      [[qX+12,qY+12,1,1],[qX+qS-12,qY+12,-1,1],[qX+12,qY+qS-12,1,-1],[qX+qS-12,qY+qS-12,-1,-1]]
        .forEach(([cx,cy,dx,dy])=>{
          ctx.strokeStyle='#10b981'; ctx.lineWidth=3.5; ctx.lineCap='round';
          ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+dx*18,cy); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx,cy+dy*18); ctx.stroke();
        });

      // You Are Here
      ctx.font='bold 30px Arial,sans-serif'; ctx.fillStyle='#ffffff';
      ctx.fillText('📍 Event Main QR Code', W/2, 730);
      ctx.font='21px Arial,sans-serif'; ctx.fillStyle='#94a3b8';
      ctx.fillText('Scan to find nearest medical, restrooms & security', W/2, 768);

      // Divider
      ctx.beginPath(); ctx.moveTo(60,840); ctx.lineTo(W-60,840);
      ctx.strokeStyle='rgba(30,41,59,0.6)'; ctx.lineWidth=1.5; ctx.stroke();

      // Footer
      ctx.font='19px Arial,sans-serif'; ctx.fillStyle='#475569';
      ctx.fillText('Developed by Confluxaa  •  confluxaa.com', W/2, 878);

      // Download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href=url; a.download=`${slug}-qr-placard.png`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
      }, 'image/png');

    } catch (err) {
      console.error('Download failed:', err);
      alert('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const qrTargetUrl = `${window.location.origin}/`;

  return (
    <div className="min-h-[85vh] w-full flex items-center justify-center py-8 md:py-16 px-4 bg-slate-50">
      
      {/* ── Main Responsive Grid Wrapper ── */}
      <div className="w-full max-w-4xl flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 animate-fade-slide-up">

        {/* ── Left Column: Hero & Information/Instructions ── */}
        <div className="text-center md:text-left space-y-5 md:flex-1 md:max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            QR Navigation System
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Event Location Placard
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Print and deploy this unique QR placard sign at the event to enable instant visitor navigation and digital guidance.
            </p>
          </div>

          {/* Quick Guide / Instructions for Administrators */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3 hidden md:block">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Placement Guidelines</h3>
            <ul className="text-xs text-slate-600 space-y-2.5">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">📍</span>
                <span>Deploy at key high-traffic checkpoints like main entry gates and info booths.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">🖨️</span>
                <span>Print in color on A4/A3 card sheets for optimal scanner readability.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">📶</span>
                <span>Enables visitors to locate medical camps, toilets, security, and dining areas in one scan.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Right Column: QR Placard Card ── */}
        <div className="w-full flex justify-center md:flex-1">
          <div
            className="relative w-full max-w-[360px] rounded-[28px] overflow-hidden border border-slate-200 bg-white"
            style={{
              boxShadow: '0 10px 30px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            {/* Subtle top accent gradient strip */}
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

            <div className="relative p-7 space-y-6 text-center">

              {/* Header badge */}
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Scan &amp; Navigate
                </div>
                <h2 className="text-lg font-black text-slate-900">Event Navigator</h2>
                <p className="text-[11px] text-slate-500">Event Navigation System</p>
              </div>

              {/* QR Code frame */}
              <div className="relative w-56 h-56 mx-auto">
                {/* Scanner crosshairs */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden">
                  <div className="absolute top-2.5 left-2.5 w-5 h-5 border-t-2 border-l-2 border-emerald-500 rounded-tl-md" />
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 border-t-2 border-r-2 border-emerald-500 rounded-tr-md" />
                  <div className="absolute bottom-2.5 left-2.5 w-5 h-5 border-b-2 border-l-2 border-emerald-500 rounded-bl-md" />
                  <div className="absolute bottom-2.5 right-2.5 w-5 h-5 border-b-2 border-r-2 border-emerald-500 rounded-br-md" />
                </div>

                {/* Scan line animation */}
                <div
                  className="absolute left-3 right-3 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-70 z-10"
                  style={{ animation: 'scanLine 2.5s ease-in-out infinite', top: '8px' }}
                />

                {/* QR image */}
                <div className="w-full h-full bg-white rounded-2xl p-3 flex items-center justify-center shadow-sm border border-slate-100">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrTargetUrl)}`}
                    alt="Event Navigator QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* CTA text */}
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">📍 Event Main QR Code</p>
                <p className="text-xs text-slate-500 leading-relaxed px-2">
                  Scan to open the interactive map and find the nearest facilities and routes.
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
              <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-center gap-1">
                Developed by
                <a href="https://confluxaa.com" target="_blank" rel="noopener noreferrer" className="font-black text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text hover:opacity-80 transition-opacity ml-0.5">
                  Confluxaa
                </a>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
