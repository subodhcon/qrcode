import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

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
    <App />
  </StrictMode>,
)
