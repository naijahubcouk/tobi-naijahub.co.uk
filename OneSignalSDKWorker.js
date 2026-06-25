importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// When notification is clicked in background, save URL and navigate
self.addEventListener('notificationclick', function(e) {
  e.notification.close();

  // Get the launch URL from notification data
  const data = e.notification.data || {};
  const launchURL = data.url || data.launchURL || data.launch_url || 'https://auntietobi.co.uk';

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
      // Send URL to any open clients
      clients.forEach(function(client) {
        client.postMessage({
          type: 'NOTIF_CLICK_URL',
          url: launchURL,
          title: e.notification.title || '',
          body: e.notification.body || ''
        });
      });

      // Open or navigate to the URL
      if (clients.length > 0) {
        return clients[0].focus().then(function(client) {
          return client.navigate(launchURL);
        });
      } else {
        return self.clients.openWindow(launchURL);
      }
    })
  );
}, false);

// When push arrives in background, save to show banner when app opens
self.addEventListener('push', function(e) {
  try {
    const data = e.data ? e.data.json() : {};
    const title = (data.headings && data.headings.en) || 'Auntie Tobi 🤖✨';
    const body = (data.contents && data.contents.en) || 'You have a new update!';
    const url = data.url || data.launch_url || 'https://auntietobi.co.uk';

    // Notify open clients to save pending notification
    self.clients.matchAll().then(function(clients) {
      clients.forEach(function(client) {
        client.postMessage({
          type: 'SAVE_PENDING_NOTIF',
          title: title,
          body: body,
          url: url
        });
      });
    });
  } catch(e) {}
});
