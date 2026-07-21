import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import 'react-day-picker/style.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
 <StrictMode>
 <App />
 </StrictMode>,
);


// Unregister old or stale service workers and clear caches to prevent cached index.html from pointing to deleted dynamic js/css bundles (white blank screen)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    let hasUnregistered = false;
    for (const registration of registrations) {
      registration.unregister().then((success) => {
        if (success) {
          console.log('Successfully unregistered stale service worker:', registration);
          hasUnregistered = true;
        }
      });
    }
    if (hasUnregistered || registrations.length > 0) {
      if ('caches' in (window as any)) {
        (window as any).caches.keys().then((names: string[]) => {
          Promise.all(names.map(name => (window as any).caches.delete(name))).then(() => {
            console.log('Cleared all service worker caches');
            (window as any).location.reload();
          });
        });
      } else {
        (window as any).location.reload();
      }
    }
  }).catch((err) => {
    console.error('Error getting service worker registrations:', err);
  });
}
