"use strict";
/* Astro Alberto. Dati: pianeti, stelle, Messier, stelle doppie, sciami. I dati non disponibili sono indicati come N/D e le stime non sono presentate come certezze. */
var PLANET_DATA = {
  Mercury:{name:"Mercurio", radius:2440.5, url:"https://edu.inaf.it/rubriche/schede-pianeti/mercurio/", massRatio:"0,055 volte la Terra (1/18)", facts:"Il pianeta più piccolo del sistema solare interno.", guide:"Non aspettarti colori o dettagli: apparirà come una piccolissima 'mezzaluna' o disco giallino che ribolle per la bassa elevazione."},
  Venus:{name:"Venere", radius:6051.8, url:"https://edu.inaf.it/rubriche/schede-pianeti/venere/", massRatio:"0,815 volte la Terra (quasi gemello)", facts:"Pianeta più caldo del sistema solare per via dell'effetto serra.", guide:"Così splendente che all'oculare rischia di abbagliare. Ammirane la fase (da sottile falce a gibbosa), meglio al crepuscolo."},
  Mars:{name:"Marte", radius:3396.2, url:"https://edu.inaf.it/rubriche/schede-pianeti/marte/", massRatio:"0,107 volte la Terra (circa un decimo)", facts:"Il pianeta rosso. Ospita l'Olympus Mons, il vulcano più alto del sistema solare.", guide:"Inizia con lo zoom Hyperion tra 12 e 16 mm (127-169x) oppure con lo SVBONY intorno a 12-15 mm (135-169x). Prova 10 mm (~203x) o 8 mm Hyperion (~254x) solo se i dettagli restano fermi."},
  Jupiter:{name:"Giove", radius:71492, url:"https://edu.inaf.it/rubriche/schede-pianeti/giove/", massRatio:"318 volte la Terra (il più imponente)", facts:"Il pianeta più imponente del sistema solare.", guide:"Per iniziare usa l'Hyperion tra 16 e 12 mm (127-169x), oppure lo SVBONY tra 15 e 12 mm (135-169x). Se il bordo è stabile, prova 10 mm (~203x)."},
  Saturn:{name:"Saturno", radius:60268, url:"https://edu.inaf.it/rubriche/schede-pianeti/saturno/", massRatio:"95 volte la Terra (col sistema di anelli)", facts:"Celebre per il maestoso sistema di anelli.", guide:"Inizia con l'Hyperion a 12-16 mm (127-169x) o lo SVBONY a 12-15 mm (135-169x). Se l'immagine è stabile prova 10 mm (~203x)."},
  Uranus:{name:"Urano", radius:25559, url:"https://edu.inaf.it/rubriche/schede-pianeti/urano/", massRatio:"14,5 volte la Terra (asse a 98°)", facts:"Gigante di ghiaccio con asse inclinato di ~98°.", guide:"Centra con il 25 mm o l'Hyperion a 24 mm (~85x). Poi prova lo zoom tra 12 e 10 mm (169-203x): piccolo disco, non dettagli superficiali."},
  Neptune:{name:"Nettuno", radius:24764, url:"https://edu.inaf.it/rubriche/schede-pianeti/nettuno/", massRatio:"17 volte la Terra (il più esterno)", facts:"Il pianeta più esterno. Venti fino a 2.000 km/h.", guide:"Centra con il 25 mm o l'Hyperion a 24 mm (~85x), poi prova 12 mm (~169x) e, se nitido, 10 mm (~203x). Disco molto piccolo, senza dettagli."}
};
var MOON_MASS_RATIO = "0,012 volte la Terra (1/81)";
var STAR_CATALOG = [
  {name:'Sirio A', ra:6.7525, dec:-16.7161, mag:-1.46, distLy:8.6, massRatio:'673.000 volte la Terra (2,02 volte il Sole)', url:'https://it.wikipedia.org/wiki/Sirio', simbad:'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Sirius'},
  {name:'Arturo', ra:14.2610, dec:19.1824, mag:-0.05, distLy:36.7, massRatio:'366.000 volte la Terra (1,10 volte il Sole)', url:'https://it.wikipedia.org/wiki/Arturo_(stella)', simbad:'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Arcturus'},
  {name:'Vega', ra:18.6156, dec:38.7837, mag:0.03, distLy:25.0, massRatio:'711.000 volte la Terra (2,135 volte il Sole)', url:'https://it.wikipedia.org/wiki/Vega', simbad:'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Vega'},
  {name:'Capella', ra:5.2782, dec:45.9980, mag:0.08, distLy:42.9, url:'https://it.wikipedia.org/wiki/Capella_(astronomia)', simbad:'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Capella'},
  {name:'Rigel A', ra:5.2423, dec:-8.2016, mag:0.13, distLy:860.0, massRatio:'6.992.000 volte la Terra (21 volte il Sole)', url:'https://it.wikipedia.org/wiki/Rigel', simbad:'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Rigel'},
  {name:'Betelgeuse', ra:5.9195, dec:7.4071, mag:0.50, distLy:642.5, massRatio:'4.994.000 volte la Terra (15 volte il Sole, stima incerta)', url:'https://it.wikipedia.org/wiki/Betelgeuse', simbad:'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Betelgeuse'},
  {name:'Altair', ra:19.8464, dec:8.8683, mag:0.77, distLy:16.7, massRatio:'596.000 volte la Terra (1,79 volte il Sole)', url:'https://it.wikipedia.org/wiki/Altair', simbad:'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Altair'},
  {name:'Aldebaran', ra:4.5987, dec:16.5093, mag:0.87, distLy:65.3, massRatio:'386.000 volte la Terra (1,16 volte il Sole)', url:'https://it.wikipedia.org/wiki/Aldebaran', simbad:'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Aldebaran'},
  {name:'Antares A', ra:16.4901, dec:-26.4320, mag:1.06, distLy:550.0, massRatio:'4.129.000 volte la Terra (12,4 volte il Sole)', url:'https://it.wikipedia.org/wiki/Antares', simbad:'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Antares'},
  {name:'Spica A', ra:13.4199, dec:-11.1613, mag:0.97, distLy:250.0, massRatio:'3.413.000 volte la Terra (10,25 volte il Sole)', url:'https://it.wikipedia.org/wiki/Spica', simbad:'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Spica'}
];
var MESSIER = [
  {name:'M31 Andromeda', id:'M31', ra:0.7123, dec:41.2692, mag:3.44, distLy:2540000, url:'https://it.wikipedia.org/wiki/Galassia_di_Andromeda'},
  {name:'M42 Orione', id:'M42', ra:5.5881, dec:-5.3911, mag:4.00, distLy:1344, url:'https://it.wikipedia.org/wiki/Nebulosa_di_Orione'},
  {name:'M45 Pleiadi', id:'M45', ra:3.7900, dec:24.1167, mag:1.60, distLy:444, url:'https://it.wikipedia.org/wiki/Pleiadi_(astronomia)'},
  {name:'M13 Ercole', id:'M13', ra:16.6949, dec:36.4613, mag:5.80, distLy:22200, url:'https://it.wikipedia.org/wiki/Messier_13'},
  {name:'M57 Anello', id:'M57', ra:18.8931, dec:33.0292, mag:8.80, distLy:2570, url:'https://it.wikipedia.org/wiki/Nebulosa_Anello'},
  {name:'M27 Manubrio', id:'M27', ra:19.9934, dec:22.7211, mag:7.50, distLy:1360, url:'https://it.wikipedia.org/wiki/Nebulosa_Manubrio'},
  {name:'M81 Bode', id:'M81', ra:9.9259, dec:69.0653, mag:6.90, distLy:11800000, url:'https://it.wikipedia.org/wiki/Messier_81'},
  {name:'M82 Sigaro', id:'M82', ra:9.9313, dec:69.6797, mag:8.40, distLy:11500000, url:'https://it.wikipedia.org/wiki/Galassia_Sigaro'}
];
var DOUBLE_STARS = [
  {key:'albireo', name:'Albireo', pln:'Albireo', ra:19.5120, dec:27.9597, mag:3.05, simbadId:'bet Cyg',
   comp:'A 3,2 arancione (K2) · B 5,1 azzurra (B8)', sep:'35,3″', sepNum:35.3, pa:'54°', epoch:'2006', diff:'facile',
   note:'La coppia più nota per il contrasto di colore. Si separa già con il 25 mm.', url:'https://en.wikipedia.org/wiki/Albireo'},
  {key:'mizar', name:'Mizar e Alcor', pln:'Mizar', ra:13.3988, dec:54.9254, mag:2.23, simbadId:'zet UMa',
   comp:'Mizar A 2,2 · Mizar B 3,9 · Alcor 4,0 a circa 12′', sep:'14,4″ (A e B)', sepNum:14.4, pa:'153°', epoch:null, diff:'facile',
   note:'Alcor si vede a occhio nudo con buona vista. Il C8 separa Mizar A da Mizar B.', url:'https://en.wikipedia.org/wiki/Mizar_and_Alcor'},
  {key:'almach', name:'Almach', pln:'Almach', ra:2.0650, dec:42.3297, mag:2.10, simbadId:'gam And',
   comp:'A 2,3 (K2) · B 4,8 (somma di B e C)', sep:'9,6″', sepNum:9.6, pa:'63°', epoch:null, diff:'facile',
   note:'La compagna B è a sua volta una coppia a 0,16″, non risolvibile con il C8.', url:'https://en.wikipedia.org/wiki/Gamma_Andromedae'},
  {key:'epslyr', name:'Epsilon Lyrae', pln:'Epsilon Lyrae', ra:18.7393, dec:39.6414, mag:4.60, simbadId:'eps Lyr',
   comp:'ε1 circa 4,7 e 6,2 · ε2 circa 5,1 e 5,5', sep:'ε1 2,3 a 2,6″ · ε2 2,3 a 2,4″ · tra le due coppie 208″', sepNum:2.3,
   pa:'ε1 347° a 350° · ε2 79° a 82° · coppie 173°', epoch:null, diff:'difficile',
   note:'Il doppio doppio. Le fonti consultate danno valori diversi per decimi di secondo d\'arco e di magnitudine. Le due coppie si distinguono a occhio nudo con vista acuta. Per dividere ciascuna servono 169x o più e seeing buono.',
   url:'https://en.wikipedia.org/wiki/Epsilon_Lyrae'},
  {key:'corcaroli', name:'Cor Caroli', pln:'Cor Caroli', ra:12.9338, dec:38.3184, mag:2.89, simbadId:'alf CVn',
   comp:'A 2,8 a 3,0 (variabile) · B 5,6', sep:'19,6″', sepNum:19.6, pa:null, epoch:null, diff:'facile',
   note:'Coppia larga e facile già con il 25 mm.', url:'https://en.wikipedia.org/wiki/Alpha_Canum_Venaticorum'},
  {key:'castor', name:'Castore', pln:'Castore', ra:7.5766, dec:31.8883, mag:1.58, simbadId:'alf Gem',
   comp:'A 1,9 · B 3,0 · C 9,8 a circa 71 a 73″', sep:'circa 6″ nel 2026', sepNum:6.0, pa:null, epoch:'2026', diff:'media',
   note:'La separazione cresce da circa 2″ nel 1970 a circa 6″ nel 2026.', url:'https://en.wikipedia.org/wiki/Castor_(star)'},
  {key:'algieba', name:'Algieba', pln:'Algieba', ra:10.3329, dec:19.8415, mag:2.01, simbadId:'gam Leo',
   comp:'A 2,3 · B 3,5', sep:'4,7″ (2022)', sepNum:4.7, pa:null, epoch:'2022', diff:'media',
   note:'Periodo orbitale di circa 553 anni. Con 4,7″ bastano 135x o 169x con seeing discreto.', url:'https://en.wikipedia.org/wiki/Gamma_Leonis'},
  {key:'izar', name:'Izar', pln:'Izar', ra:14.7498, dec:27.0742, mag:2.35, simbadId:'eps Boo',
   comp:'A 2,5 (K0) · B 4,8 (A2)', sep:'2,85″', sepNum:2.85, pa:'343°', epoch:'J2000', diff:'difficile',
   note:'Coppia stretta. Servono 169x o più e seeing buono.', url:'https://en.wikipedia.org/wiki/Epsilon_Bo%C3%B6tis'},
  {key:'rigel', name:'Rigel', pln:'Rigel', ra:5.2423, dec:-8.2016, mag:0.13, simbadId:'bet Ori', radar:false,
   comp:'A 0,1 · B 6,7 (somma di B 7,5 e C 7,6)', sep:'9,5″', sepNum:9.5, pa:'204°', epoch:null, diff:'difficile per contrasto',
   note:'La luce di Rigel A disturba la compagna. Prova 169x o più con seeing buono.', url:'https://en.wikipedia.org/wiki/Rigel'},
  {key:'polaris', name:'Polare', pln:'Polare', ra:2.5303, dec:89.2641, mag:1.98, simbadId:'alf UMi', radar:false,
   comp:'A 2,0 · B 8,7', sep:'18,2″', sepNum:18.2, pa:'231° (epoca 2005,6)', epoch:'2005,6', diff:'media per contrasto',
   note:'La compagna è debole rispetto alla primaria. Usa 135x o più e un cielo scuro.', url:'https://en.wikipedia.org/wiki/Polaris'}
];
var DOUBLE_SOURCE = 'Coordinate Hipparcos. Separazioni WDS riportate da Wikipedia e czsky.eu. I valori cambiano nel tempo.';
var SHOWERS = [
  {name:"Quadrantidi", s:[0,1], e:[0,10], zhr:110},{name:"Liridi", s:[3,16], e:[3,25], zhr:18},
  {name:"Eta Aquaridi", s:[3,19], e:[4,28], zhr:50},{name:"Delta Aquaridi", s:[6,12], e:[7,23], zhr:25},
  {name:"Perseidi", s:[6,17], e:[7,24], zhr:100},{name:"Orionidi", s:[9,2], e:[10,7], zhr:20},
  {name:"Leonidi", s:[10,6], e:[10,30], zhr:15},{name:"Geminidi", s:[11,4], e:[11,17], zhr:150},
  {name:"Ursidi", s:[11,17], e:[11,26], zhr:10}
];

var CONIT=(function(){var o={};'And:Andromeda,Ant:Macchina Pneumatica,Aps:Uccello del Paradiso,Aql:Aquila,Aqr:Acquario,Ara:Altare,Ari:Ariete,Aur:Auriga,Boo:Boote,CMa:Cane Maggiore,CMi:Cane Minore,CVn:Cani da Caccia,Cae:Bulino,Cam:Giraffa,Cap:Capricorno,Car:Carena,Cas:Cassiopea,Cen:Centauro,Cep:Cefeo,Cet:Balena,Cha:Camaleonte,Cir:Compasso,Cnc:Cancro,Col:Colomba,Com:Chioma di Berenice,CrA:Corona Australe,CrB:Corona Boreale,Crt:Cratere,Cru:Croce del Sud,Crv:Corvo,Cyg:Cigno,Del:Delfino,Dor:Dorado,Dra:Dragone,Equ:Cavallino,Eri:Eridano,For:Fornace,Gem:Gemelli,Gru:Gru,Her:Ercole,Hor:Orologio,Hya:Idra,Hyi:Idro,Ind:Indiano,LMi:Leone Minore,Lac:Lucertola,Leo:Leone,Lep:Lepre,Lib:Bilancia,Lup:Lupo,Lyn:Lince,Lyr:Lira,Men:Mensa,Mic:Microscopio,Mon:Unicorno,Mus:Mosca,Nor:Norma,Oct:Ottante,Oph:Ofiuco,Ori:Orione,Pav:Pavone,Peg:Pegaso,Per:Perseo,Phe:Fenice,Pic:Pittore,PsA:Pesce Australe,Psc:Pesci,Pup:Poppa,Pyx:Bussola,Ret:Reticolo,Scl:Scultore,Sco:Scorpione,Sct:Scudo,Ser:Serpente,Sex:Sestante,Sge:Freccia,Sgr:Sagittario,Tau:Toro,Tel:Telescopio,TrA:Triangolo Australe,Tri:Triangolo,Tuc:Tucano,UMa:Orsa Maggiore,UMi:Orsa Minore,Vel:Vele,Vir:Vergine,Vol:Pesce Volante,Vul:Volpetta'.split(',').forEach(function(p){var q=p.split(':');o[q[0]]=q[1];});return o;})();
