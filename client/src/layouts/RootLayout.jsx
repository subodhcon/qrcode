import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * RootLayout defines the base wrapper structure of the application.
 * Stripped of all headers and footers to keep a clean distraction-free UI.
 */
export default function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Decorative Top Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-48 bg-gradient-to-b from-indigo-500/10 to-transparent blur-3xl pointer-events-none" />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <Outlet />
      </main>
    </div>
  );
}
