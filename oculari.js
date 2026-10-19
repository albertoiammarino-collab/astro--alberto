"use strict";
/* Astro Alberto. Dati: oculari e campo apparente. I dati non disponibili sono indicati come N/D e le stime non sono presentate come certezze. */
var AFOV_DEFAULTS = {p25:52, p15:null, sv7:57, sv21:40, hy8:68, hy24:50};
var EP_ROWS = [
  {l:'25 mm orig.', f:25, fam:'p25', b:1, use:'Ricerca, centraggio, ammassi aperti'},
  {l:'Hyperion 24 mm', f:24, fam:'hy', b:1, use:"Visione d'insieme, ricerca"},
  {l:'SVBONY 21 mm', f:21, fam:'sv', b:1, use:'Luna, oggetti estesi'},
  {l:'Hyperion 16 mm', f:16, fam:'hy', b:1, use:'Luna e pianeti (equilibrato)'},
  {l:'15 mm orig.', f:15, fam:'p15', b:1, use:'Ingrandimento intermedio'},
  {l:'SVBONY 15 mm', f:15, fam:'sv', b:1, use:'Ingrandimento intermedio'},
  {l:'Hyperion 12 mm', f:12, fam:'hy', b:1, use:'Luna e pianeti se immagine stabile'},
  {l:'Hyperion 10 mm', f:10, fam:'hy', b:1, use:'Dettagli planetari con buon seeing'},
  {l:'Hyperion 8 mm', f:8, fam:'hy', b:1, use:'Seeing molto buono'},
  {l:'SVBONY 7 mm', f:7, fam:'sv', b:1, use:'Estremo, raramente utile'},
  {l:'25 mm orig.', f:25, fam:'p25', b:2, use:'Alternativa al 12 mm senza Barlow'},
  {l:'SVBONY 21 mm', f:21, fam:'sv', b:2, use:'Tra 10 e 8 mm, buon compromesso'},
  {l:'SVBONY 15 mm', f:15, fam:'sv', b:2, use:'Solo con seeing sopra la media'},
  {l:'Hyperion 12 mm', f:12, fam:'hy', b:2, use:'6 mm virtuale, seeing perfetto'},
  {l:'Hyperion 10 mm', f:10, fam:'hy', b:2, use:'Oltre il limite pratico del C8'}
];
