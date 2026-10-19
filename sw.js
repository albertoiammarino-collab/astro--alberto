"use strict";
/* Astro Alberto. Service worker.
   Salva i file dell'applicazione per l'avvio senza rete.
   Le richieste verso altri domini (meteo, NOAA, librerie) non passano dalla cache.
   Cambia VERSIONE a ogni pubblicazione per forzare l'aggiornamento. */
var VERSIONE = 'astro-alberto-2026-10-19';
var FILE = [
  './',
  'index.html',
  'css/app.css',
  'data/catalogo.js',
  'data/luna.js',
  'data/stelle.js',
  'data/oculari.js',
  'js/stato.js',
  'js/effemeridi.js',
  'js/luna_pianeti.js',
  'js/oculari.js',
  'js/planisfero.js',
  'js/bersagli.js',
  'js/dettaglio_ar_radar.js',
  'js/luna_tab.js',
  'js/aggiornamento.js',
  'js/meteo.js',
  'js/app.js',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(VERSIONE).then(function(cache){
      // Un file mancante non blocca l'installazione.
      return Promise.all(FILE.map(function(url){
        return cache.add(url).catch(function(){});
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(chiavi){
      return Promise.all(chiavi.filter(function(k){
        return k.indexOf('astro-alberto-') === 0 && k !== VERSIONE;
      }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.open(VERSIONE).then(function(cache){
      return cache.match(req, {ignoreSearch:true}).then(function(salvato){
        var rete = fetch(req).then(function(risposta){
          if (risposta && risposta.ok) cache.put(req, risposta.clone());
          return risposta;
        }).catch(function(){
          if (salvato) return salvato;
          if (req.mode === 'navigate') return cache.match('index.html');
          return Response.error();
        });
        // Mostra subito la copia salvata e aggiorna in secondo piano.
        return salvato || rete;
      });
    })
  );
});
