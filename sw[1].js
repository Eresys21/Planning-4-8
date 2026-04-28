// Service Worker — Planning 4x8 ADN — version simplifiee
// Ne met en cache QUE apres le premier chargement reussi

var CACHE_NAME = "planning4x8-v2";

self.addEventListener("install", function(event) {
  self.skipWaiting();
});

self.addEventListener("activate", function(event) {
  // Supprimer tous les anciens caches
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.map(function(n) { return caches.delete(n); }));
    })
  );
  self.clients.claim();
});

// Ne pas intercepter les requetes - laisser le reseau faire son travail
self.addEventListener("fetch", function(event) {
  event.respondWith(fetch(event.request));
});

// Clic sur notification
self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({type:"window", includeUncontrolled:true}).then(function(list) {
      for(var i=0;i<list.length;i++){
        if(list[i].url.indexOf("planning_4x8")>=0 && "focus" in list[i]) return list[i].focus();
      }
      return clients.openWindow("planning_4x8.html");
    })
  );
});
