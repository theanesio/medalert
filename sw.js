/* MedAlert — Service Worker v7 */
const CACHE   = 'medalert-v7';
const VERSION = '1.4.0';
const FILES   = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  console.log('[SW] v7 instalando...');
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  console.log('[SW] v7 ativando...');
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
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
        if(resp && resp.status === 200 && resp.type !== 'opaque'){
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
  if(e.data.type === 'SKIP_WAITING')      self.skipWaiting();
  if(e.data.type === 'FORCAR_ATUALIZACAO'){
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.registration.update());
  }
});

/* Clique na notificação nativa */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const data = e.notification.data || {};

  if(e.action === 'tomei') {
    // Confirmar toma via mensagem para o app
    e.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        if(list.length > 0) {
          list[0].postMessage({ type: 'CONFIRMAR_TOMA', medId: data.medId, horario: data.horario });
          return list[0].focus();
        }
        return clients.openWindow('./');
      })
    );
  } else if(e.action === 'depois') {
    // Reagendar em 15 minutos
    e.waitUntil(
      new Promise(resolve => {
        setTimeout(() => {
          self.registration.showNotification('💊 Lembrete: ' + (data.nome || 'Medicamento'), {
            body:             (data.dose || '') + ' · ' + (data.horario || ''),
            icon:             './icons/icon-192.png',
            badge:            './icons/icon-72.png',
            tag:              'reforco-' + (data.medId || '') + '-' + (data.horario || ''),
            requireInteraction: true,
            vibrate:          [300, 100, 300, 100, 600],
            actions: [
              { action: 'tomei',  title: '✅ TOMEI' },
              { action: 'depois', title: '⏱️ 15 min' }
            ],
            data: data
          });
          resolve();
        }, 15 * 60 * 1000);
      })
    );
  } else {
    // Clique no corpo da notificação — abrir app
    e.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        if(list.length > 0) return list[0].focus();
        return clients.openWindow('./');
      })
    );
  }
});
