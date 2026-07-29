import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../context/LanguageContext';

const LANGUAGES = [
  { key: 'en', label: 'English' },
  { key: 'hi', label: 'हिन्दी' },
  { key: 'bn', label: 'বাংলা' },
  { key: 'te', label: 'తెలుగు' },
  { key: 'mr', label: 'मराठी' },
  { key: 'ta', label: 'தமிழ்' },
  { key: 'gu', label: 'ગુજરાતી' },
  { key: 'kn', label: 'ಕನ್ನಡ' },
  { key: 'ml', label: 'മലയാളം' },
  { key: 'pa', label: 'ਪੰਜਾਬੀ' },
  { key: 'or', label: 'ଓଡ଼ିଆ' },
  { key: 'ur', label: 'اردو' },
];

export default function LanguageSelector() {
  const { currentLanguage, changeLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLang = LANGUAGES.find((l) => l.key === currentLanguage) || LANGUAGES[0];

  return (
    <div className="relative z-50 inline-block text-left" ref={dropdownRef}>
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-800 bg-slate-950/80 hover:bg-slate-900 text-slate-300 text-xs font-semibold shadow transition-all cursor-pointer"
          id="menu-button"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <span>🌐</span>
          <span>{activeLang.label}</span>
          <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-40 rounded-2xl shadow-2xl bg-slate-950 border border-slate-800/80 focus:outline-none z-[100] overflow-hidden max-h-60 overflow-y-auto no-scrollbar animate-fade-in"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="menu-button"
          tabIndex="-1"
        >
          <div className="py-1" role="none">
            {LANGUAGES.map((lang) => {
              const isSelected = lang.key === currentLanguage;
              return (
                <button
                  key={lang.key}
                  onClick={() => {
                    changeLanguage(lang.key);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors block cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                  role="menuitem"
                  tabIndex="-1"
                >
                  {lang.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
