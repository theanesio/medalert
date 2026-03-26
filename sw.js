/* MedAlert — Service Worker v16
   FORÇAR ATUALIZAÇÃO COMPLETA — limpa todos os caches anteriores */
const CACHE   = 'medalert-v23';
const VERSION = '1.9.1';
const FILES   = ['./', './index.html', './manifest.json',
                 './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  console.log('[SW] v16 instalando — limpeza total');
  // skipWaiting imediato para substituir qualquer SW antigo
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILES))
  );
});

self.addEventListener('activate', e => {
  console.log('[SW] v16 ativando');
  e.waitUntil(
    // Deletar TODOS os caches antigos sem exceção
    caches.keys()
      .then(keys => Promise.all(keys.map(k => {
        console.log('[SW] Deletando cache:', k);
        return caches.delete(k);
      })))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(c => c.postMessage({ type: 'SW_ATUALIZADO', version: VERSION }));
      }))
  );
});

self.addEventListener('fetch', e => {
  if(!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(resp => {
        if(resp && resp.status === 200 && resp.type !== 'opaque') {
          caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        }
        return resp;
      }).catch(() => {
        if(e.request.destination === 'document') return caches.match('./index.html');
      });
    })
  );
});

self.addEventListener('message', e => {
  if(!e.data) return;
  if(e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if(e.data.type === 'FORCAR_ATUALIZACAO') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.registration.update());
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if(list.length) return list[0].focus();
      return clients.openWindow('./');
    })
  );
});
