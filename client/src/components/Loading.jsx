import React from 'react';

/**
 * A premium reusable Loading spinner component.
 * Supports full screen or container bound loading states.
 */
export default function Loading({ fullScreen = false, message = 'Loading resources...' }) {
  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md'
    : 'w-full min-h-[300px] flex flex-col items-center justify-center p-8';

  return (
    <div className={containerClasses}>
      <div className="relative flex items-center justify-center">
        {/* Outer glowing ring */}
        <div className="w-16 h-16 rounded-full border-4 border-t-indigo-500 border-r-purple-500 border-b-pink-500 border-l-slate-800 animate-spin"></div>
        {/* Inner pulsing logo/dot */}
        <div className="absolute w-6 h-6 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full animate-ping opacity-75"></div>
      </div>
      
      {message && (
        <p className="mt-4 text-sm font-medium text-slate-400 tracking-wide animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}
