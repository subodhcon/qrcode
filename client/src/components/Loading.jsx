import React from 'react';

/**
 * Premium reusable Loading component.
 * Uses an emerald arc ring + pulsing dot with brand typography.
 */
export default function Loading({ fullScreen = false, message = 'Loading...' }) {
  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md'
    : 'w-full min-h-[260px] flex flex-col items-center justify-center p-8';

  return (
    <div className={containerClasses}>
      <div className="relative flex items-center justify-center mb-5">
        {/* Outer arc ring */}
        <svg className="w-14 h-14 animate-spin" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="22" stroke="#1e293b" strokeWidth="4" />
          <path
            d="M28 6 A22 22 0 0 1 50 28"
            stroke="url(#spinGrad)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="spinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
        </svg>
        {/* Center pulsing dot */}
        <span className="absolute w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-500/50" />
      </div>

      {message && (
        <p className="text-xs font-semibold text-slate-500 tracking-wide animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}
