/* sw.js — Service Worker V39 (Styled footer)
   - Cache-then-network strategy
*/
const CACHE_NAME = 'pbc-static-v94';
const PRECACHE_URLS = [
  '/', 
  '/index.html',
  '/style.css?v=94',
  '/app_final.js?v=94',
  '/data.js',
  '/quizzes.js',
  '/course.js',
  '/tools_logic.js?v=94',
  '/firebase-init.js?v=94'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Força o novo SW a assumir imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS.map(u => new Request(u, {cache: 'reload'}))).catch(()=>{ return; });
    })
  );
});

self.addEventListener('activate', event => {
  clients.claim(); 
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)) // Limpa cache antigo
    ))
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)) 
  );
});
