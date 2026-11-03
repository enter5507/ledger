// 記帳 APP 的離線設定：有網路時永遠抓最新版，沒網路時用上次存的版本。
const V = 'ledger-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);

  if (u.origin === location.origin) {
    // 自己的檔案：先連網路抓最新，失敗（沒網路）才用存起來的
    e.respondWith(
      fetch(r).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(r, copy)); }
        return res;
      }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('index.html')))
    );
  } else if (u.hostname === 'cdn.jsdelivr.net') {
    // 登入用的函式庫：存起來，沒網路時也能載入
    e.respondWith(
      caches.match(r).then(m => m || fetch(r).then(res => {
        const copy = res.clone(); caches.open(V).then(c => c.put(r, copy)); return res;
      }))
    );
  }
  // 其他（例如 Supabase 的資料請求）不攔截，直接走網路
});
