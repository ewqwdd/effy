const CACHE_NAME = "static-v1";

const CACHEABLE_FILES = [
  "jquery",
  "E-v1.js",
  "interFontFace",
  "publicApi",
  "player",
];

const FONT_EXTS = [".woff2", ".woff", ".ttf", ".otf", ".eot", ".svg"];

function shouldCache(url) {
  const fileName = url.split("/").pop().split("?")[0].toLowerCase();
  if (CACHEABLE_FILES.some((name) => fileName.includes(name.toLowerCase())))
    return true;
  if (FONT_EXTS.some((ext) => fileName.endsWith(ext))) return true;
  if (fileName.endsWith(".jsonp")) return true;
  if (fileName.includes("swatch")) return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  if (!shouldCache(event.request.url)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);

      // Отдаём кэш, если есть, иначе ждём сеть
      if (cached) {
        // Фоновое обновление кэша (не блокирует отдачу ответа)
        fetch(event.request)
          .then(async (response) => {
            if (response.ok) {
              const headers = new Headers(response.headers);
              headers.set("sw-cache-time", Date.now().toString());
              const cloned = new Response(await response.blob(), {
                status: response.status,
                statusText: response.statusText,
                headers,
              });
              cache.put(event.request, cloned);
            }
          })
          .catch(() => {
            /* ignore network errors */
          });
        return cached;
      } else {
        // Если кэша нет — ждём сеть и кладём в кэш
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            const headers = new Headers(response.headers);
            headers.set("sw-cache-time", Date.now().toString());
            const cloned = new Response(await response.blob(), {
              status: response.status,
              statusText: response.statusText,
              headers,
            });
            cache.put(event.request, cloned.clone());
            return cloned;
          }
          return response;
        } catch {
          return new Response("Network error", { status: 503 });
        }
      }
    })
  );
});

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.map((n) => n !== CACHE_NAME && caches.delete(n)))
      )
  );
});
