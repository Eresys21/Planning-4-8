// Service Worker — Planning 4x8 ADN — v4
// Systeme de notifications fiables via periodicsync + setInterval

var CACHE_NAME = "planning4x8-v4";
var CHECK_INTERVAL = 60000; // Verifier toutes les 60 secondes

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
  // Demarrer la boucle de verification des alarmes
  startAlarmCheck();
});

self.addEventListener("fetch", function(event) {
  event.respondWith(fetch(event.request).catch(function() {
    return caches.match(event.request);
  }));
});

// ============================================================
// BOUCLE DE VERIFICATION DES ALARMES
// ============================================================
function startAlarmCheck() {
  setInterval(function() {
    checkAlarms();
  }, CHECK_INTERVAL);
}

function checkAlarms() {
  // Lire les alarmes depuis IndexedDB
  openDB().then(function(db) {
    var tx = db.transaction("alarmes", "readwrite");
    var store = tx.objectStore("alarmes");
    var req = store.getAll();
    req.onsuccess = function() {
      var alarmes = req.result || [];
      var now = Date.now();
      alarmes.forEach(function(alarme) {
        // Declencher si l'heure est passee (avec 2 min de tolerance)
        if(alarme.time <= now && alarme.time > now - 120000) {
          self.registration.showNotification("Planning 4x8 - " + alarme.nom, {
            body: "C'est l'heure ! " + alarme.nom + " (" + alarme.duree + ")" + (alarme.note ? "\n" + alarme.note : ""),
            icon: "icon-192.png",
            badge: "icon-192.png",
            tag: "alarme_" + alarme.id,
            requireInteraction: true,
            vibrate: [300, 100, 300, 100, 300],
            actions: [
              {action: "fait", title: "Fait"},
              {action: "reporter", title: "Reporter 30min"}
            ]
          });
          // Supprimer l'alarme declenchee
          store.delete(alarme.id);
        }
        // Supprimer les alarmes trop vieilles (> 5 min)
        if(alarme.time < now - 300000) {
          store.delete(alarme.id);
        }
      });
    };
  }).catch(function(e) { console.log("DB err:", e); });
}

// ============================================================
// INDEXEDDB
// ============================================================
function openDB() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open("planning4x8", 1);
    req.onupgradeneeded = function(e) {
      var db = e.target.result;
      if(!db.objectStoreNames.contains("alarmes")) {
        db.createObjectStore("alarmes", {keyPath: "id"});
      }
    };
    req.onsuccess = function(e) { resolve(e.target.result); };
    req.onerror = function(e) { reject(e); };
  });
}

// ============================================================
// RECEPTION DES MESSAGES DE L'APP
// ============================================================
self.addEventListener("message", function(event) {
  var data = event.data;
  if(!data) return;

  if(data.type === "SET_ALARMS") {
    // Enregistrer les alarmes envoyees par l'app
    openDB().then(function(db) {
      var tx = db.transaction("alarmes", "readwrite");
      var store = tx.objectStore("alarmes");
      // Effacer les anciennes alarmes
      store.clear().onsuccess = function() {
        // Enregistrer les nouvelles
        data.alarmes.forEach(function(a) { store.put(a); });
        console.log("SW: " + data.alarmes.length + " alarmes enregistrees");
      };
    });
  }

  if(data.type === "CLEAR_ALARMS") {
    openDB().then(function(db) {
      var tx = db.transaction("alarmes", "readwrite");
      tx.objectStore("alarmes").clear();
    });
  }

  if(data.type === "PING") {
    // Keepalive depuis l'app - verifier les alarmes immediatement
    checkAlarms();
  }
});

// ============================================================
// CLIC SUR NOTIFICATION
// ============================================================
self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  var action = event.action;

  if(action === "reporter") {
    // Reporter de 30 minutes
    openDB().then(function(db) {
      var tx = db.transaction("alarmes", "readwrite");
      var alarme = {
        id: "report_" + Date.now(),
        nom: event.notification.title.replace("Planning 4x8 - ", ""),
        time: Date.now() + 30 * 60000,
        duree: "",
        note: "Reporte"
      };
      tx.objectStore("alarmes").put(alarme);
    });
    return;
  }

  // Ouvrir l'app
  event.waitUntil(
    clients.matchAll({type:"window", includeUncontrolled:true}).then(function(list) {
      for(var i = 0; i < list.length; i++) {
        if("focus" in list[i]) return list[i].focus();
      }
      return clients.openWindow("index.html");
    })
  );
});

// Periodic sync si disponible (Android moderne)
self.addEventListener("periodicsync", function(event) {
  if(event.tag === "check-alarms") {
    event.waitUntil(checkAlarms());
  }
});
