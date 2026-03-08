import { Workbox } from 'workbox-window';

export function register() {
  if ('serviceWorker' in navigator) {
    const wb = new Workbox(`${process.env.PUBLIC_URL}/service-worker.js`);

    wb.addEventListener('installed', (event) => {
      if (event.isUpdate) {
        if (window.confirm('New version available! Click OK to refresh.')) {
          window.location.reload();
        }
      }
    });

    wb.register();
  }
}
