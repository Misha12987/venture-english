/* Venture English — offline copy of the app.
   VERSION changes with every build, so uploading new files replaces the old copy on the phone. */
const VERSION = "9809171dd9";
const SHELL = "venture-shell-" + VERSION;
const FONTS = "venture-fonts-v1";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const offlinePage = () => new Response(
  "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'>" +
  "<p style='font:16px system-ui;padding:24px'>Нет подключения к интернету. Откройте тренажёр ещё раз, когда появится сеть.</p>",
  { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
);

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    /* app files: answer from the saved copy at once and refresh it in the background */
    const fresh = fetch(req).then(async res => {
      if (res && res.ok) { const cache = await caches.open(SHELL); await cache.put(req, res.clone()); }
      return res;
    }).catch(() => null);
    event.waitUntil(fresh.then(() => undefined));
    event.respondWith(
      caches.match(req, { ignoreSearch: true })
        .then(hit => hit || (req.mode === "navigate" ? caches.match("index.html") : undefined))
        .then(hit => hit || fresh.then(res => res || offlinePage()))
    );
    return;
  }

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    /* fonts: saved after the first online launch, system fonts are used until then */
    event.respondWith(caches.open(FONTS).then(cache => cache.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
      return res;
    }).catch(() => Response.error()))));
  }
});
