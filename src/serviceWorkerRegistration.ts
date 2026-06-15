import { Workbox } from 'workbox-window';

export function register() {
  if ('serviceWorker' in navigator) {
    const wb = new Workbox(`${import.meta.env.BASE_URL}service-worker.js`);
    const wasControlled = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!wasControlled || refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    wb.addEventListener('waiting', () => {
      wb.messageSkipWaiting();
    });

    wb.register().then((registration) => {
      if (!registration) return;

      const checkForUpdate = () => {
        registration.update().catch((error) => {
          console.warn('Service worker update check failed', error);
        });
      };

      checkForUpdate();

      window.addEventListener('focus', checkForUpdate);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkForUpdate();
        }
      });
    }).catch((error) => {
      console.warn('Service worker registration failed', error);
    });
  }
}
