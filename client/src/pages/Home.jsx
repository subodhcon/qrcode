import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

export default function Home() {
  const { t, currentLanguage } = useTranslation();
  const [downloading, setDownloading] = useState(false);

  const qrTargetUrl = `${window.location.origin}/`;
  const highResQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&ecc=H&data=${encodeURIComponent(qrTargetUrl)}`;

  // Pure Canvas download — Crisp print quality @2x with official Bodh Gaya branding
  const downloadQR = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const slug = 'bodhgaya-digital-guide';

      // Fetch QR as blob to avoid canvas CORS taint
      const loadImg = (url) =>
        fetch(url)
          .then((r) => { if (!r.ok) throw new Error(); return r.blob(); })
          .then((blob) => new Promise((res, rej) => {
            const img = new Image();
            img.onload = () => res(img);
            img.onerror = rej;
            img.src = URL.createObjectURL(blob);
          }));

      const qrImg = await loadImg(highResQrUrl);

      // Canvas dimensions @2x (800x1160) for sharp A4 print output
      const W = 800, H = 1160, R = 36;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');

      const rr = (x, y, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      };

      // 1. Background gradient (Rich Slate / Deep Midnight Navy)
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#090d16');
      bg.addColorStop(0.5, '#0f172a');
      bg.addColorStop(1, '#020617');
      rr(0, 0, W, H, R);
      ctx.fillStyle = bg;
      ctx.fill();
      rr(0, 0, W, H, R);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 2. Subtle top ambient glow
      const g = ctx.createRadialGradient(W / 2, 80, 0, W / 2, 80, 360);
      g.addColorStop(0, 'rgba(16, 185, 129, 0.18)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // 3. Top badge pill: ज्ञान की पावन भूमि (Land of Enlightenment)
      const bW = 380, bH = 38, bX = (W - bW) / 2, bY = 46;
      rr(bX, bY, bW, bH, 19);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fill();
      rr(bX, bY, bW, bH, 19);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bX + 22, bY + 19, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText(currentLanguage === 'hi' ? '• ज्ञान की पावन भूमि •' : '• LAND OF ENLIGHTENMENT •', W / 2 + 8, bY + 25);

      // 4. Main Title
      ctx.font = '900 42px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      const mainTitle = currentLanguage === 'hi' ? 'बोधगया डिजिटल गाइड' : 'Bodh Gaya Digital Guide';
      ctx.fillText(mainTitle, W / 2, 140);

      // Subtitle
      ctx.font = '600 18px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('नगर परिषद बोधगया • Dynamic QR Navigation Guide', W / 2, 172);

      // 5. QR White Box
      const qS = 450, qX = (W - qS) / 2, qY = 205, qP = 25;
      rr(qX, qY, qS, qS, 24);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.drawImage(qrImg, qX + qP, qY + qP, qS - qP * 2, qS - qP * 2);

      // Scanner corners
      [[qX + 14, qY + 14, 1, 1], [qX + qS - 14, qY + 14, -1, 1], [qX + 14, qY + qS - 14, 1, -1], [qX + qS - 14, qY + qS - 14, -1, -1]]
        .forEach(([cx, cy, dx, dy]) => {
          ctx.strokeStyle = '#059669';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + dx * 22, cy);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx, cy + dy * 22);
          ctx.stroke();
        });

      // 6. Scan CTA Instruction
      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = '#f8fafc';
      const scanInstruction = currentLanguage === 'hi' ? '📱 किसी भी फोन कैमरे से स्कैन करें' : '📱 Scan with any Phone Camera or Google Lens';
      ctx.fillText(scanInstruction, W / 2, 698);

      ctx.font = '500 17px sans-serif';
      ctx.fillStyle = '#cbd5e1';
      const subInstruction = currentLanguage === 'hi' 
        ? 'महाबोधि मंदिर, मठ, पेयजल, शौचालय व अस्पताल का सीधा रास्ता'
        : 'Open live interactive map, find nearest temples, toilets, water & medical';
      ctx.fillText(subInstruction, W / 2, 730);

      // 7. Facilities Quick Icons Bar
      const fBoxW = 680, fBoxH = 60, fBoxX = (W - fBoxW) / 2, fBoxY = 765;
      rr(fBoxX, fBoxY, fBoxW, fBoxH, 16);
      ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.fill();
      rr(fBoxX, fBoxY, fBoxW, fBoxH, 16);
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = '#e2e8f0';
      const facilitiesList = currentLanguage === 'hi'
        ? '🛕 मंदिर   •   💧 पेयजल   •   🚻 शौचालय   •   🏥 अस्पताल   •   🅿️ पार्किंग'
        : '🛕 Temples   •   💧 Water   •   🚻 Toilets   •   🏥 Hospitals   •   🅿️ Parking';
      ctx.fillText(facilitiesList, W / 2, fBoxY + 36);

      // 8. Emergency Helpline Bar
      const eBoxW = 680, eBoxH = 75, eBoxX = (W - eBoxW) / 2, eBoxY = 845;
      rr(eBoxX, eBoxY, eBoxW, eBoxH, 16);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
      ctx.fill();
      rr(eBoxX, eBoxY, eBoxW, eBoxH, 16);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#fca5a5';
      ctx.fillText(currentLanguage === 'hi' ? '🚨 24x7 आपातकालीन सहायता हेल्पलाइन' : '🚨 24x7 Emergency Services & Helpline', W / 2, eBoxY + 30);

      ctx.font = '900 18px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Emergency: 112   |   Police: 100   |   Ambulance: 102   |   Fire: 101', W / 2, eBoxY + 57);

      // 9. Divider
      ctx.beginPath();
      ctx.moveTo(60, 960);
      ctx.lineTo(W - 60, 960);
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 10. Footer Section
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('🏛️ नगर परिषद बोधगया द्वारा अधिकृत (Authorized by Nagar Parishad Bodh Gaya)', W / 2, 1010);

      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Bodh Gaya Dynamic QR Navigation System  •  Developed by Yuganta Solutions (yugantasolutions.in)', W / 2, 1045);

      // Download triggered
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${slug}-qr-placard.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');

    } catch (err) {
      console.error('Download failed:', err);
      alert('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Direct print function
  const handleDirectPrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center py-6 md:py-10 px-4 bg-slate-50">
      
      {/* ── Print Specific Styles ── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-placard, #printable-placard * {
            visibility: visible;
          }
          #printable-placard {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100% !important;
            margin: 0;
            padding: 0;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ── Top Bar: Back Link & Language Selector ── */}
      <header className="w-full max-w-4xl flex items-center justify-between pb-6 mb-2 border-b border-slate-200/80 no-print">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-emerald-700 transition-colors px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm"
        >
          <span>←</span>
          <span>{t('backToHome') || "Back to Guide"}</span>
        </Link>
        <LanguageSelector />
      </header>
      
      {/* ── Main Responsive Grid Wrapper ── */}
      <div className="w-full max-w-4xl flex flex-col md:flex-row items-center md:items-start justify-between gap-8 md:gap-12 animate-fade-slide-up">

        {/* ── Left Column: Instructions & Placement Guidelines ── */}
        <div className="text-center md:text-left space-y-5 md:flex-1 md:max-w-md no-print">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-50 text-emerald-700 text-[11px] font-black uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t('badge') || "Bodh Gaya Digital Guide"}
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {t('qrPlacardTitle') || "Bodh Gaya Official QR Placard"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              {t('qrPlacardSubtitle') || "Print and deploy this official QR placard sign across key locations in Bodh Gaya to enable instant visitor navigation and digital guidance."}
            </p>
          </div>

          {/* Quick Guide / Instructions for Administrators */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5 text-left">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span>📋</span>
              <span>{t('placementGuidelines') || "Placement Guidelines"}</span>
            </h3>
            <ul className="text-xs text-slate-600 space-y-3 font-medium">
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-600 text-sm shrink-0">📍</span>
                <span>{t('guidelineCheckpoint') || "Deploy at key high-traffic checkpoints like Mahabodhi Temple gates, Gaya Railway Station, bus stands, and information booths."}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-600 text-sm shrink-0">🖨️</span>
                <span>{t('guidelinePaper') || "Print in color on A4/A3 card sheets for optimal weather resistance and scanner readability."}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-600 text-sm shrink-0">📶</span>
                <span>{t('guidelineServices') || "Enables visitors to locate medical camps, toilets, security desks, and temples in one instant scan."}</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons for Mobile / Tablet */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={downloadQR}
              disabled={downloading}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-xs sm:text-sm font-extrabold text-white cursor-pointer transition-all duration-200 disabled:opacity-60 disabled:cursor-wait bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20 active:scale-98"
            >
              {downloading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeLinecap="round" strokeOpacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <span>{t('submitting') || "Generating..."}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>{t('downloadPlacardBtn') || "Download Print Placard"}</span>
                </>
              )}
            </button>

            <button
              onClick={handleDirectPrint}
              className="flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-xs sm:text-sm font-extrabold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 shadow-sm transition-all cursor-pointer active:scale-98"
            >
              <span>🖨️</span>
              <span>{t('directPrintBtn') || "Print Directly"}</span>
            </button>
          </div>
        </div>

        {/* ── Right Column: QR Placard Live Card (Printable Area) ── */}
        <div className="w-full flex justify-center md:flex-1">
          <div
            id="printable-placard"
            className="relative w-full max-w-[370px] rounded-[28px] overflow-hidden border border-slate-200 bg-white shadow-xl"
          >
            {/* Top Amber Accent Strip */}
            <div className="h-1.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500" />

            <div className="p-6 sm:p-7 space-y-5 text-center">

              {/* Header badge */}
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-amber-400 text-amber-300 text-[10px] font-black uppercase tracking-widest shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  {t('welcomeSubHeader') || "Land of Enlightenment"}
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {t('welcomeCity') || "Bodh Gaya"}
                </h2>
                <p className="text-[11px] font-bold text-slate-500">
                  {t('badge') || "Bodh Gaya Digital Guide"}
                </p>
              </div>

              {/* QR Code frame with High Error Correction */}
              <div className="relative w-56 h-56 mx-auto">
                {/* Scanner crosshairs */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                  <div className="absolute top-2.5 left-2.5 w-5 h-5 border-t-2 border-l-2 border-emerald-500 rounded-tl-md" />
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 border-t-2 border-r-2 border-emerald-500 rounded-tr-md" />
                  <div className="absolute bottom-2.5 left-2.5 w-5 h-5 border-b-2 border-l-2 border-emerald-500 rounded-bl-md" />
                  <div className="absolute bottom-2.5 right-2.5 w-5 h-5 border-b-2 border-r-2 border-emerald-500 rounded-br-md" />
                </div>

                {/* Animated Scan Line */}
                <div
                  className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-80 z-10 pointer-events-none no-print"
                  style={{ animation: 'scanLine 2.5s ease-in-out infinite', top: '8px' }}
                />

                {/* High Res QR Image */}
                <div className="w-full h-full bg-white rounded-2xl p-3 flex items-center justify-center shadow-inner border border-slate-100">
                  <img
                    src={highResQrUrl}
                    alt="Bodh Gaya Digital Guide QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* CTA text */}
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-900 flex items-center justify-center gap-1.5">
                  <span>📍</span>
                  <span>{t('qrMainCodeTitle') || "Bodh Gaya Main Guide QR Code"}</span>
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed px-1">
                  {t('qrScanCTA') || "Scan to open live interactive map, discover Mahabodhi Temple, Monasteries, Drinking Water, Restrooms, Hospitals & Emergency SOS."}
                </p>
              </div>

              {/* Emergency strip on the physical placard */}
              <div className="rounded-xl bg-red-50 border border-red-200/80 p-2.5 text-center space-y-0.5">
                <p className="text-[10px] font-black text-red-700 uppercase tracking-wider">
                  🚨 {t('emergencyHelpline') || "Emergency Helpline"}
                </p>
                <p className="text-xs font-black text-slate-900">
                  112 • 100 • 102 • 101
                </p>
              </div>

              {/* Official Authorization & Footer */}
              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 space-y-1">
                <p className="font-bold text-amber-700">
                  🏛️ {t('authorizedBy') || "Authorized by Nagar Parishad Bodh Gaya."}
                </p>
                <div className="flex items-center justify-center gap-1 text-[9px] text-slate-400">
                  <span>Developed by</span>
                  <a
                    href="https://yugantasolutions.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-black text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text hover:opacity-80 transition-opacity ml-0.5"
                  >
                    Yuganta Solutions
                  </a>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
