/* MedAlert — Service Worker v4
   Suporte a atualização forçada via botão no app */

const CACHE   = 'medalert-v4';
const VERSION = '1.2.0';
const FILES   = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

/* ── INSTALL ─────────────────────────────────────────────── */
self.addEventListener('install', e => {
  console.log('[SW] Instalando versão', VERSION);
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(FILES))
      .then(() => self.skipWaiting()) // Ativa imediatamente sem esperar fechar aba
  );
});

/* ── ACTIVATE ────────────────────────────────────────────── */
self.addEventListener('activate', e => {
  console.log('[SW] Ativando versão', VERSION);
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => {
          console.log('[SW] Removendo cache antigo:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim()) // Assume controle de todas as abas abertas
      .then(() => {
        // Avisar todas as abas que há uma nova versão
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'SW_ATUALIZADO', version: VERSION });
          });
        });
      })
  );
});

/* ── FETCH: cache-first ──────────────────────────────────── */
self.addEventListener('fetch', e => {
  // Nunca interceptar chamadas à API externa
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && resp.type !== 'opaque') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => {
        if (e.request.destination === 'document') return caches.match('./index.html');
      });
    })
  );
});

/* ── MENSAGEM: forçar atualização ────────────────────────── */
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'FORCAR_ATUALIZACAO') {
    console.log('[SW] Forçando atualização...');
    // Limpar todo o cache e se re-instalar
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.registration.update());
  }
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/* ── NOTIFICAÇÃO ─────────────────────────────────────────── */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      if (list.length) return list[0].focus();
      return clients.openWindow('./');
    })
  );
});
