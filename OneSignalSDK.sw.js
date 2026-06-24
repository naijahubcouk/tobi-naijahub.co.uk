importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// Save notification launch URL before PWA strips it
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const url = event.notification.data && event.notification.data.url 
    ? event.notification.data.url 
    : (event.notification.data && event.notification.data.launchURL)
    ? event.notification.data.launchURL
    : null;

  if (url) {
    // Store in IndexedDB since localStorage not available in SW
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        // Send to any open clients
        clients.forEach(client => {
          client.postMessage({ type: 'NOTIF_CLICK_URL', url });
        });
        // Open or focus the app with the URL
        if (clients.length > 0) {
          clients[0].focus();
          clients[0].navigate(url);
        } else {
          self.clients.openWindow(url);
        }
      })
    );
  }
}, false);
