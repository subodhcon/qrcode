import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations } from '../services/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setCurrentLanguage(lang);
      localStorage.setItem('language', lang);
    }
  };

  const t = (key) => {
    const langDict = translations[currentLanguage] || translations['en'];
    return langDict[key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
