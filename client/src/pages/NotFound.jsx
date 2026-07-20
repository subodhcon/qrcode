import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-gradient-to-tr from-indigo-500/10 to-pink-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Error Code */}
      <h1 className="text-8xl md:text-9xl font-extrabold tracking-widest text-slate-800 select-none animate-pulse">
        404
      </h1>
      
      {/* Glow text on top */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-16 pointer-events-none select-none">
        <span className="text-7xl md:text-8xl font-black text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text opacity-30 blur-[2px]">
          404
        </span>
      </div>

      <div className="space-y-4 max-w-md relative z-10">
        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Page not found
        </h2>
        <p className="text-slate-400 text-sm md:text-base leading-relaxed">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
      </div>

      {/* Action Button */}
      <div className="mt-8 relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-95 text-white font-medium shadow-lg shadow-indigo-500/25 transition-all focus:outline-none"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>
      </div>
    </div>
  );
}
