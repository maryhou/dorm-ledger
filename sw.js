/* 宿舍小帳本 service worker — cache-first, offline-ready */
const CACHE = "dorm-ledger-v10";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./public/Assets/Eye.jpg",
  "./public/Assets/Smile.jpg",
  "./public/Assets/welcome.jpg",
  "./public/Assets/empty.jpg",
  "./public/Assets/groceries.jpg",
  "./public/Assets/outofstock.gif",
  "./public/Assets/shared_items/popsicle.png",
  "./public/Assets/shared_items/coffeebean.png",
  "./public/Assets/shared_items/teabag.png",
  "./public/Assets/shared_items/tissue.png",
  "./public/Assets/shared_items/tea.png",
  "./public/Assets/shared_items/lemon.png",
  "./public/Assets/shared_items/butter.png",
  "./public/Assets/shared_items/salmon.png",
  "./public/Assets/shared_items/cabbage.png",
  "./public/Assets/shared_items/bread.png",
  "./public/Assets/avatar_image/avatar_01.png",
  "./public/Assets/avatar_image/avatar_02.png",
  "./public/Assets/avatar_image/avatar_03.png",
  "./public/Assets/avatar_image/avatar_04.png",
  "./public/Assets/avatar_image/avatar_05.png",
  "./public/Assets/avatar_image/avatar_06.png",
  "./public/Assets/avatar_image/avatar_07.png",
  "./public/Assets/avatar_image/avatar_08.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* network-first：有網路就拿最新版並更新快取，離線時退回快取 */
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request, { ignoreSearch: true }).then(
          (hit) => hit || (e.request.mode === "navigate" ? caches.match("./index.html") : Response.error())
        )
      )
  );
});
