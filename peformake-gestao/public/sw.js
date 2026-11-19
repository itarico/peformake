// Desliga o service worker do site antigo (Lovable) que ficou instalado em alguns navegadores em 19/11/2026,
// quando uma publicação errada colocou o site antigo no ar por alguns minutos. O sistema não usa service worker:
// este arquivo apaga o cache velho, se remove e recarrega as abas abertas com a versão certa.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
    await self.registration.unregister()
    const tabs = await self.clients.matchAll({ type: 'window' })
    tabs.forEach((c) => c.navigate(c.url))
  })())
})
