var CACHE_NAME = "planning4x8-v3";

self.addEventListener("install", function(event) {
  self.skipWaiting();
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.map(function(n) { return caches.delete(n); }));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(event) {
  event.respondWith(fetch(event.request));
});

self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({type:"window", includeUncontrolled:true}).then(function(list) {
      for(var i=0;i<list.length;i++){
        if(list[i].url.indexOf("index")>=0 && "focus" in list[i]) return list[i].focus();
      }
      return clients.openWindow("index.html");
    })
  );
});
