import React, { useState, useEffect } from 'react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);
  const [platform, setPlatform] = useState('other'); // 'ios' | 'android' | 'desktop' | 'other'

  useEffect(() => {
    // Detect OS / Platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    const isDesktopDevice = /windows|macintosh|linux/.test(userAgent) && !isIosDevice && !isAndroidDevice;

    if (isIosDevice) setPlatform('ios');
    else if (isAndroidDevice) setPlatform('android');
    else if (isDesktopDevice) setPlatform('desktop');

    // Check if app is already running in standalone mode (installed as PWA)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsStandalone(true);
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted PWA installation');
      }
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else if (platform === 'ios') {
      alert('To install DIN App on your iPhone/iPad:\n\n1. Tap the Share button (⎋) at the bottom of Safari.\n2. Scroll down and tap "Add to Home Screen" (➕).\n3. Tap "Add".');
    } else if (platform === 'desktop') {
      alert('To install DIN App on Windows / Mac / Linux:\n\n• Look for the Install App icon (📥) at the right end of your browser address bar.\n• Or open Chrome/Edge Menu (⋮) -> "Cast, save and share" -> "Install page as app".');
    } else {
      alert('To install DIN App:\n\n• Open browser menu (⋮) -> Tap "Add to Home screen" or "Install App".');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-bounce-in">
      <div className="bg-slate-900/95 text-white border border-emerald-500/50 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center text-xl shrink-0 shadow-lg shadow-emerald-600/30">
            📲
          </div>
          <div className="min-w-0 text-left">
            <h4 className="text-xs font-black text-white truncate flex items-center gap-1.5">
              <span>Install DIN App</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : 'PWA'}
              </span>
            </h4>
            <p className="text-[10px] text-slate-300 truncate">1-Tap Home Screen Access & Offline Map</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-xs shadow-md shadow-emerald-500/30 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
          >
            <span>📥</span>
            <span>Install</span>
          </button>
          <button
            onClick={handleDismiss}
            className="w-7 h-7 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

