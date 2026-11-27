/*
 * 온노아ERP 앱(PWA) 서비스 워커
 * - 화면 파일은 항상 인터넷에서 새로 받음 → 고치면 앱도 바로 최신
 * - 인터넷이 끊기면 마지막으로 연 첫 화면 또는 안내 문구를 보여 줌
 * - 데이터(Supabase)는 건드리지 않음
 */
const CACHE = "onnoa-shell-v3"

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()))

self.addEventListener("fetch", (e) => {
  const req = e.request
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return
  if (req.mode !== "navigate") return
  e.respondWith(
    fetch(req, { cache: "no-store" })
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put("shell", copy))
        return res
      })
      .catch(() =>
        caches.match("shell").then(
          (m) =>
            m ||
            new Response("<meta charset=utf-8><p style='font-family:sans-serif;padding:24px'>인터넷 연결을 확인해 주세요. 연결되면 온노아ERP가 다시 열립니다.</p>", {
              headers: { "Content-Type": "text/html; charset=utf-8" },
            }),
        ),
      ),
  )
})

/* ── 메시지 알림 (웹 푸시) ── */
self.addEventListener("push", (e) => {
  let d = {}
  try {
    d = e.data ? e.data.json() : {}
  } catch {
    d = { body: e.data ? e.data.text() : "" }
  }
  const base = self.registration.scope
  e.waitUntil(
    self.registration.showNotification(d.title || "온노아ERP 메시지", {
      body: d.body || "새 메시지가 왔어요",
      icon: base + "app/icon-192.png",
      badge: base + "app/badge-96.png",
      tag: "chat-" + (d.room || "msg"),
      renotify: true,
      vibrate: [80, 60, 80],
      data: { url: base + (d.url || "#/messages") },
    }),
  )
})

self.addEventListener("notificationclick", (e) => {
  e.notification.close()
  const target = (e.notification.data && e.notification.data.url) || self.registration.scope
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.registration.scope) && "focus" in c) {
          c.navigate(target).catch(() => {})
          return c.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})
