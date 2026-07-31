import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'

// Register PWA Service Worker for offline support & automatic updates
registerSW({ immediate: true })

// Filter out Google Maps deprecation warnings from console
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    args[0].includes('google.maps') &&
    (args[0].includes('deprecated') || args[0].includes('deprecation'))
  ) {
    return;
  }
  originalWarn(...args);
};


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
)
