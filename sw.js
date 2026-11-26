// Permite abrir la app sin internet (los datos se sincronizan al volver la conexión)
const CACHE='taller-v145';
const SHELL=['./','index.html','firebase-config.js','manifest.json','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE&&x!=='taller-cdn').map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
const CDN=/^https:\/\/(www\.gstatic\.com|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net)\//;
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  // librerías de internet (Firebase, QR, letras): se guardan para poder abrir el sistema sin internet
  if(e.request.method==='GET'&&CDN.test(e.request.url)){e.respondWith(caches.open('taller-cdn').then(c=>c.match(e.request).then(r=>r||fetch(e.request).then(x=>{if(x&&(x.ok||x.type==='opaque'))c.put(e.request,x.clone());return x}))));return}
  if(e.request.method!=='GET'||u.origin!==location.origin)return; // Firebase y librerías van directo a internet
  if(/version\.json/.test(u.pathname))return;
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||(/\.js$/.test(u.pathname)?Response.error():caches.match('index.html')))));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();const id=e.notification.data&&e.notification.data.id;
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{
    const c=cs.find(x=>x.url.startsWith(self.registration.scope));
    if(c){c.focus();if(id)c.postMessage({open:id});return}
    return self.clients.openWindow('./'+(id?'#orden-'+id:''));
  }));
});
