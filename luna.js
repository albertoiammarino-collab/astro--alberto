"use strict";
/* Astro Alberto. Dati: siti, crateri, mari, monti, lune galileiane. I dati non disponibili sono indicati come N/D e le stime non sono presentate come certezze. */
var LUNAR_LANDING_SITES = [
  {name:'Apollo 11', lat:0.674, lon:23.473, year:1969, country:'USA', mission:'Primo uomo sulla Luna (Armstrong, Aldrin)', desc:'Mare della Tranquillità'},
  {name:'Apollo 12', lat:-3.012, lon:-23.422, year:1969, country:'USA', mission:'Secondo sbarco, recupero Surveyor 3', desc:'Oceanus Procellarum'},
  {name:'Apollo 14', lat:-3.645, lon:-17.471, year:1971, country:'USA', mission:'Shepard, Mitchell — Fra Mauro', desc:'Fra Mauro'},
  {name:'Apollo 15', lat:26.132, lon:3.634, year:1971, country:'USA', mission:'Primo uso del Lunar Roving Vehicle', desc:'Hadley Rille'},
  {name:'Apollo 16', lat:-8.973, lon:15.501, year:1972, country:'USA', mission:'Altopiani Descartes', desc:'Descartes Highlands'},
  {name:'Apollo 17', lat:20.190, lon:30.772, year:1972, country:'USA', mission:'Ultimo sbarco umano (Cernan, Schmitt)', desc:'Taurus-Littrow'},
  {name:'Luna 9', lat:7.13, lon:-64.37, year:1966, country:'URSS', mission:'Primo atterraggio morbido', desc:'Oceanus Procellarum'},
  {name:'Luna 16', lat:-0.68, lon:56.30, year:1970, country:'URSS', mission:'Ritorno campioni automatico', desc:'Mare Fecunditatis'},
  {name:'Luna 17', lat:38.28, lon:-35.00, year:1970, country:'URSS', mission:'Lunokhod 1 rover', desc:'Mare Imbrium'},
  {name:'Luna 20', lat:3.57, lon:56.50, year:1972, country:'URSS', mission:'Ritorno campioni', desc:'Mare Fecunditatis'},
  {name:'Luna 21', lat:25.85, lon:30.45, year:1973, country:'URSS', mission:'Lunokhod 2 rover', desc:'Le Monnier'},
  {name:'Luna 24', lat:12.25, lon:62.20, year:1976, country:'URSS', mission:'Ultimo ritorno campioni sovietico', desc:'Mare Crisium'},
  {name:"Chang'e 3", lat:44.12, lon:-19.51, year:2013, country:'Cina', mission:'Yutu rover', desc:'Mare Imbrium'},
  {name:"Chang'e 5", lat:43.06, lon:-51.92, year:2020, country:'Cina', mission:'Ritorno campioni', desc:'Mons Rümker'},
  {name:'Chandrayaan-3', lat:-69.37, lon:32.35, year:2023, country:'India', mission:'Primo atterraggio vicino al polo sud', desc:'Polo Sud'},
  {name:'SLIM', lat:-13.3, lon:25.2, year:2024, country:'Giappone', mission:'Precision landing (~100 m)', desc:'Cratere Shioli, margine del Mare Nectaris'},
  {name:'IM-1 Odysseus', lat:-80.13, lon:1.44, year:2024, country:'USA (privato)', mission:'Primo lander commerciale', desc:'Polo Sud (Malapert A)'}
];
var LUNAR_CRATERS = [
  {name:'Tycho', lat:-43.3, lon:-11.2, diameter:85, desc:'Giovane cratere con raggi luminosi visibili da Terra'},
  {name:'Copernico', lat:9.6, lon:-20.1, diameter:93, desc:'Cratere brillante con sistema di raggi'},
  {name:'Clavius', lat:-58.4, lon:-14.4, diameter:225, desc:'Grande cratere con crateri interni a catena'},
  {name:'Platone', lat:51.6, lon:-9.3, diameter:101, desc:'Fondo scuro, senza picchi centrali'},
  {name:'Aristarco', lat:23.7, lon:-47.4, diameter:40, desc:'Il più brillante della Luna'},
  {name:'Keplero', lat:8.1, lon:-38.0, diameter:32, desc:'Cratere con raggi luminosi'},
  {name:'Aristotele', lat:50.2, lon:17.4, diameter:87, desc:'Cratere con pareti terrazzate'},
  {name:'Eudosso', lat:44.3, lon:16.0, diameter:67, desc:'Vicino al Caucaso'},
  {name:'Pitagora', lat:63.5, lon:-62.8, diameter:130, desc:'Cratere con ombre spettacolari'},
  {name:'Grimaldi', lat:-5.5, lon:-68.3, diameter:173, desc:'Fondo molto scuro'}
];
var LUNAR_MARIA = [
  {name:'Mare Tranquillitatis', nameIt:'Mare della Tranquillità', lat:8.5, lon:31.4, area:873000, desc:'Sito Apollo 11'},
  {name:'Mare Serenitatis', nameIt:'Mare della Serenità', lat:28.0, lon:17.5, area:707000, desc:'Mare ben definito'},
  {name:'Mare Imbrium', nameIt:'Mare delle Piogge', lat:32.8, lon:-15.6, area:1123000, desc:'Il più grande mare singolo'},
  {name:'Mare Crisium', nameIt:'Mare delle Crisi', lat:17.0, lon:59.1, area:176000, desc:'Mare isolato e ben delimitato'},
  {name:'Mare Fecunditatis', nameIt:'Mare della Fecondità', lat:-7.8, lon:51.3, area:326000, desc:'Sito Luna 16 e Luna 20'},
  {name:'Mare Nectaris', nameIt:'Mare del Nettare', lat:-15.2, lon:35.5, area:100000, desc:'Bacino circolare a sud di Mare Tranquillitatis'},
  {name:'Oceanus Procellarum', nameIt:'Oceano delle Tempeste', lat:18.4, lon:-57.4, area:4000000, desc:"L'unico 'oceanus'"},
  {name:'Mare Humorum', nameIt:"Mare dell'Umidità", lat:-24.4, lon:-38.6, area:113000, desc:'Circondato da scarpate'},
  {name:'Mare Nubium', nameIt:'Mare delle Nubi', lat:-21.3, lon:-16.6, area:715000, desc:'A sud di Copernico'},
  {name:'Mare Vaporum', nameIt:'Mare dei Vapori', lat:13.3, lon:3.6, area:245000, desc:'Vicino agli Appennini'}
];
var LUNAR_MOUNTAINS = [
  {name:'Montes Apenninus', nameIt:'Appennini', lat:18.9, lon:-3.7, length:600, desc:'Catena montuosa più spettacolare'},
  {name:'Montes Caucasus', nameIt:'Caucaso', lat:38.4, lon:10.0, length:445, desc:'Tra Mare Serenitatis e Imbrium'},
  {name:'Montes Carpatus', nameIt:'Carpazi', lat:14.5, lon:-24.4, length:361, desc:'Bordo sud di Mare Imbrium'},
  {name:'Montes Jura', nameIt:'Giura', lat:47.0, lon:-36.0, length:420, desc:'Circonda Sinus Iridum'},
  {name:'Montes Recti', nameIt:'Monti Diritti', lat:48.3, lon:-19.5, length:90, desc:'Catena rettilinea'},
  {name:'Montes Riphaeus', nameIt:'Rifei', lat:-7.6, lon:-27.5, length:189, desc:'Resti di anelli di bacino'}
];

// ====================================================== M5: lune di Giove, fasi, anelli di Saturno
var JUP_RADIUS_KM = 71492;
var GALILEAN = [
  {k:'io',name:'Io',color:'#f2c14e'},
  {k:'europa',name:'Europa',color:'#bcd7ff'},
  {k:'ganymede',name:'Ganimede',color:'#d9a273'},
  {k:'callisto',name:'Callisto',color:'#aeb7c6'}
];
