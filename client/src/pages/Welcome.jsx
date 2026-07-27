import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Welcome() {
  const [sosActive, setSosActive] = useState(false);

  return (
    <div className="max-w-md mx-auto min-h-[85vh] flex flex-col justify-between py-8 px-4 animate-fade-in text-white">
      
      {/* ── SOS Modal ── */}
      {sosActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl" style={{
            background: 'linear-gradient(160deg, #1a0a0a 0%, #0f172a 100%)',
            border: '1px solid rgba(239,68,68,0.3)'
          }}>
            <div className="h-1 bg-gradient-to-r from-red-600 to-red-400" />
            <div className="p-6 space-y-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-3xl animate-bounce">🚨</div>
              <div>
                <h3 className="text-xl font-black text-white">Emergency Helpline</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Call emergency contacts directly for immediate assistance in Gaya.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4 space-y-2 text-left">
                <a href="tel:112" className="flex justify-between items-center text-xs py-1 hover:text-red-400 transition-colors">
                  <span className="text-slate-400">Emergency Helpline</span>
                  <span className="text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-lg border border-red-500/20">📞 112</span>
                </a>
                <a href="tel:100" className="flex justify-between items-center text-xs py-1 hover:text-red-400 transition-colors">
                  <span className="text-slate-400">Police Dispatch</span>
                  <span className="text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-lg border border-red-500/20">📞 100</span>
                </a>
              </div>
              <button
                onClick={() => setSosActive(false)}
                className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors cursor-pointer"
              >
                Dismiss Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Section (Welcome & Logo) ── */}
      <div className="text-center space-y-4 pt-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Gaya Digital Guide
        </div>
        <h1 className="text-3xl font-black text-transparent bg-gradient-to-b from-white to-slate-300 bg-clip-text leading-tight">
          Welcome to Gaya
        </h1>
        <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
          Your digital assistant for real-time information, safety assistance, and navigation during events.
        </p>
      </div>

      {/* ── Center Section (Primary Action) ── */}
      <div className="my-8 space-y-4">
        {/* Main Interactive Map Card */}
        <div 
          className="rounded-3xl p-6 relative overflow-hidden group"
          style={{
            background: 'linear-gradient(160deg, #0f172a 0%, #050d1a 100%)',
            border: '1px solid rgba(30,41,59,0.8)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 60px -20px rgba(99,102,241,0.08)'
          }}
        >
          {/* Accent glow on hover */}
          <div className="absolute -top-16 -right-16 w-44 h-44 bg-indigo-500/6 rounded-full blur-3xl pointer-events-none transition-all group-hover:bg-indigo-500/10" />
          
          <div className="relative space-y-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 8px 20px rgba(16,185,129,0.3)' }}>
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Interactive Navigation Map</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Find the nearest toilets, help desks, medical centers, parking, and get walking directions.
              </p>
            </div>

            <Link
              to="/map"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl text-sm font-bold text-white transition-all duration-200 active:scale-[0.98] cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 8px 24px rgba(16,185,129,0.2)'
              }}
            >
              Open Navigation Map
            </Link>
          </div>
        </div>

        {/* Emergency SOS Quick Launch */}
        <button
          onClick={() => setSosActive(true)}
          className="w-full py-4 px-5 rounded-2xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span>🚨</span>
            <span>Emergency SOS Help</span>
          </div>
          <span className="text-xs">Call Helpline →</span>
        </button>
      </div>

      {/* ── Bottom Section (Footer) ── */}
      <div className="text-center space-y-4 pt-4 border-t border-slate-900/60">
        <p className="text-[10px] text-slate-500 leading-relaxed max-w-xs mx-auto">
          Authorized by District Administration Gaya. For updates or feedback, visit information booths.
        </p>
        <div className="text-[10px] text-slate-700 font-medium">
          Powered by{' '}
          <a href="https://confluxaa.com" target="_blank" rel="noopener noreferrer"
            className="font-extrabold text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text hover:opacity-80 transition-opacity">
            Confluxaa
          </a>
        </div>
      </div>

    </div>
  );
}
