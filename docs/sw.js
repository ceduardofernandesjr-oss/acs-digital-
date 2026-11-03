// ACS DIGITAL — service worker: guarda só os arquivos do aplicativo (nunca dados de pacientes)
var VERSAO = 'acs-311d9c11fd';
var ARQUIVOS = ["./","index.html","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","js/config.js","vendor/supabase.js","js/plataforma.js","js/motores.js","js/app.js","vendor/xlsx.full.min.js","vendor/jspdf.umd.min.js","vendor/jspdf.plugin.autotable.min.js"];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSAO).then(function (c) { return c.addAll(ARQUIVOS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('acs-') === 0 && k !== VERSAO; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;   // Supabase e demais origens: sempre direto na rede
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (r) {
      if (r.ok) { var cp = r.clone(); caches.open(VERSAO).then(function (c) { c.put('index.html', cp); }); }
      return r;
    }).catch(function () { return caches.match('index.html'); }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (h) {
    return h || fetch(req).then(function (r) {
      if (r.ok && r.type === 'basic') { var cp = r.clone(); caches.open(VERSAO).then(function (c) { c.put(req, cp); }); }
      return r;
    });
  }));
});
