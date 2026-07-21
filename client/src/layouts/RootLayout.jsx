import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * RootLayout — premium dark glassmorphism base shell.
 * Stripped of headers/footers for a focused, distraction-free experience.
 */
export default function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden" style={{
      background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(16,185,129,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(99,102,241,0.06) 0%, transparent 60%), #020617'
    }}>
      {/* Top ambient glow strip */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
      
      {/* Subtle grid pattern overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '64px 64px'
      }} />

      {/* Main content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <Outlet />
      </main>

      {/* Bottom ambient glow */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
    </div>
  );
}
