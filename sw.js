// 漢字読み道場 Service Worker
// アプリを更新したら VERSION の数字を上げてください（古いキャッシュが自動で削除されます）
const VERSION = 'v4';
const CACHE = 'kanji-yomi-' + VERSION;
const FONT_CACHE = 'kanji-yomi-fonts';
const KVG_CACHE = 'kanji-yomi-kanjivg';
const APP_FILES = [
  './',
  './index.html',
  './README.md',
  './questions.csv',
  './kanji.csv',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './sound/quiz-correct_pinpon.mp3',
  './sound/quiz-wrong_buzzer.mp3'
];
const KEEP = [CACHE, FONT_CACHE, KVG_CACHE];

// インストール時：アプリ本体と問題データをまとめて保存
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

// 有効化時：古いバージョンのキャッシュを削除
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !KEEP.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ネット優先：取得できたら保存し、つながらなければ保存済みを返す
function networkFirst(req, key) {
  return fetch(req).then(r => {
    if (r.ok) {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(key || req, copy));
    }
    return r;
  }).catch(async () => (await caches.match(key || req)) || (await caches.match(req)) || caches.match('./index.html'));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts：保存済みを優先し、裏で更新
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT_CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  // 画面（HTML）：ネット優先
  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, './index.html'));
    return;
  }

  // README と CSV：ネット優先（CSVを直せば VERSION を上げなくても反映される）
  if (/\.(md|csv)$/.test(url.pathname)) {
    e.respondWith(networkFirst(req));
    return;
  }

  // 書き順SVG：保存済み優先。なければ取得して保存（一度表示した漢字はオフラインでも見られる）
  if (url.pathname.includes('/kanjivg/')) {
    e.respondWith(caches.open(KVG_CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok) c.put(req, r.clone());
      return r;
    }));
    return;
  }

  // その他（アイコンなど）：保存済み優先
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
