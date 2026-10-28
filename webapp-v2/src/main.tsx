import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker directly so Android, Tablet, and Desktop Chrome always enable native "Install App" (even when HMR is disabled)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        reg.update().catch(() => {});
      })
      .catch(() => {
        // Ignore service worker error in restricted third-party iframe
      });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
