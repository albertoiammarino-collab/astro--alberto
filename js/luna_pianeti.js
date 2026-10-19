"use strict";
/* Astro Alberto. Geometria lunare, terminatore, lune di Giove, fasi, anelli, sicurezza Sole. I dati non disponibili sono indicati come N/D e le stime non sono presentate come certezze. */
// ====================================================== M4: geometria selenografica
function deg2rad(d){return d*Math.PI/180;}
function rad2deg(r){return r*180/Math.PI;}
function normLon(l){return ((l+180)%360+360)%360-180;}
function itn(x,d){return Number(x).toFixed(d).replace('.',',');}
function moonSelenographic(date){
  var libr=A.Libration(date);
  var mv=A.GeoVector(A.Body.Moon,date,false);
  var sv=A.GeoVector(A.Body.Sun,date,false);
  var ax=A.RotationAxis(A.Body.Moon,date);
  var a0=deg2rad(ax.ra*15), d0=deg2rad(ax.dec), W=deg2rad(ax.spin);
  var n=[Math.cos(d0)*Math.cos(a0),Math.cos(d0)*Math.sin(a0),Math.sin(d0)];
  var N=[Math.cos(a0+Math.PI/2),Math.sin(a0+Math.PI/2),0];
  var M=[n[1]*N[2]-n[2]*N[1], n[2]*N[0]-n[0]*N[2], n[0]*N[1]-n[1]*N[0]];
  var fx=[0,1,2].map(function(i){return N[i]*Math.cos(W)+M[i]*Math.sin(W);});
  var fy=[0,1,2].map(function(i){return -N[i]*Math.sin(W)+M[i]*Math.cos(W);});
  function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
  var toSun=[sv.x-mv.x, sv.y-mv.y, sv.z-mv.z];
  var len=Math.hypot(toSun[0],toSun[1],toSun[2]);
  toSun=toSun.map(function(v){return v/len;});
  var sunLon=rad2deg(Math.atan2(dot(toSun,fy),dot(toSun,fx)));
  var sunLat=rad2deg(Math.asin(Math.max(-1,Math.min(1,dot(toSun,n)))));
  var colong=((90-sunLon)%360+360)%360;
  return {elon:libr.elon, elat:libr.elat, sunLon:sunLon, sunLat:sunLat, colong:colong,
    waxing:(colong>=270||colong<90)};
}
function sunAltAtFeature(lat, lon, sel){
  var p=deg2rad(lat), sl=deg2rad(sel.sunLat), dl=deg2rad(lon-sel.sunLon);
  return rad2deg(Math.asin(Math.max(-1,Math.min(1,Math.sin(sl)*Math.sin(p)+Math.cos(sl)*Math.cos(p)*Math.cos(dl)))));
}
function earthFacing(lat, lon, sel){
  var p=deg2rad(lat), e=deg2rad(sel.elat), dl=deg2rad(lon-sel.elon);
  return Math.sin(e)*Math.sin(p)+Math.cos(e)*Math.cos(p)*Math.cos(dl);
}
function moonFeaturesList(){
  var out=[];
  LUNAR_CRATERS.forEach(function(c){out.push({name:c.name,kind:'cratere',lat:c.lat,lon:c.lon});});
  LUNAR_MARIA.forEach(function(m){out.push({name:m.nameIt,kind:'mare, centro',lat:m.lat,lon:m.lon});});
  LUNAR_MOUNTAINS.forEach(function(m){out.push({name:m.nameIt,kind:'catena montuosa',lat:m.lat,lon:m.lon});});
  LUNAR_LANDING_SITES.forEach(function(x){out.push({name:x.name,kind:'sito di allunaggio',lat:x.lat,lon:x.lon});});
  return out;
}
function fmtSelLon(l){var v=normLon(l);return itn(Math.abs(v),1)+'° '+(v>=0?'Est':'Ovest');}
function fmtSelLat(l){return itn(Math.abs(l),1)+'° '+(l>=0?'Nord':'Sud');}
function terminatorFeatures(sel){
  var list=[];
  moonFeaturesList().forEach(function(f){
    var h=sunAltAtFeature(f.lat,f.lon,sel);
    var facing=earthFacing(f.lat,f.lon,sel);
    if(h>=0 && h<=12 && facing>0.05){list.push({name:f.name,kind:f.kind,h:h,limb:facing<0.3});}
  });
  list.sort(function(a,b){return a.h-b.h;});
  return list.slice(0,14);
}
function renderMoonTerminator(refTime, now, moonPeakAlt){
  var el=document.getElementById('moonTermBlock');
  if(!el) return;
  try{
    var selNow=moonSelenographic(now);
    var sel=moonSelenographic(refTime);
    var tl=sel.waxing?normLon(sel.sunLon-90):normLon(sel.sunLon+90);
    var elonTxt=Math.abs(sel.elon)<0.3?'quasi nulla':(sel.elon>0?'oltre il lembo Est (lato Mare Crisium)':'oltre il lembo Ovest (lato Oceanus Procellarum)');
    var elatTxt=Math.abs(sel.elat)<0.3?'quasi nulla':(sel.elat>0?'oltre il polo Nord':'oltre il polo Sud');
    var list=terminatorFeatures(sel);
    var html='<div class="term-title">TERMINATORE E LIBRAZIONE</div>'
      +'<div class="term-row"><span>Colongitudine ora</span><b>'+itn(selNow.colong,1)+'°</b></div>'
      +'<div class="term-row"><span>Punto subsolare alle '+fmtTime(refTime)+'</span><b>'+fmtSelLon(sel.sunLon)+', '+fmtSelLat(sel.sunLat)+'</b></div>'
      +'<div class="term-row"><span>Terminatore '+(sel.waxing?'del mattino (alba lunare)':'della sera (tramonto lunare)')+'</span><b>'+fmtSelLon(tl)+'</b></div>'
      +'<div class="term-row"><span>Librazione in longitudine</span><b>'+(sel.elon>=0?'+':'')+itn(sel.elon,1)+'°</b></div>'
      +'<div class="term-row"><span>Librazione in latitudine</span><b>'+(sel.elat>=0?'+':'')+itn(sel.elat,1)+'°</b></div>'
      +'<div class="term-note">Si vede un poco '+elonTxt+' e '+elatTxt+'. Est e Ovest sono quelli selenografici: Est è il lato del Mare Crisium. La colongitudine cresce di circa 12,2° al giorno. Vale 0° al primo quarto, 90° alla Luna piena, 180° all\'ultimo quarto e 270° alla Luna nuova.</div>';
    if(moonPeakAlt!==null && moonPeakAlt<5) html+='<div class="term-note">Stanotte la Luna resta quasi sempre sotto l\'orizzonte. L\'elenco vale per la geometria alle '+fmtTime(refTime)+'.</div>';
    html+='<div class="term-sub">Dettagli vicino al terminatore alle '+fmtTime(refTime)+'</div>';
    if(!list.length) html+='<div class="term-note">Nessun dettaglio del catalogo dell\'app ha il Sole tra 0° e 12° di quota e risulta rivolto verso la Terra. Il catalogo contiene solo alcuni dettagli principali.</div>';
    else{
      html+='<ul class="term-list">'+list.map(function(f){
        return '<li><b>'+escapeHtml(f.name)+'</b> <i>('+f.kind+')</i> · Sole a '+itn(f.h,1)+'° sul dettaglio'+(f.limb?' · vicino al lembo, visto di scorcio':'')+'</li>';
      }).join('')+'</ul>';
      html+='<div class="term-note">Con il Sole basso le ombre sono lunghe e il rilievo risalta. L\'elenco usa il catalogo dell\'app e include solo i dettagli noti all\'app.</div>';
    }
    el.innerHTML=html;
  }catch(err){ el.innerHTML='<div class="term-title">TERMINATORE E LIBRAZIONE</div><div class="term-note">Dato non disponibile.</div>'; }
}
function jupiterMoonsView(date){
  var g=A.GeoVector(A.Body.Jupiter,date,true);
  var dist=Math.hypot(g.x,g.y,g.z);
  var lightDays=dist/173.1446327;
  var jm=A.JupiterMoons(new Date(date.getTime()-lightDays*86400000));
  var ra=Math.atan2(g.y,g.x), dec=Math.asin(g.z/dist);
  var e=[-Math.sin(ra),Math.cos(ra),0];
  var nn=[-Math.sin(dec)*Math.cos(ra),-Math.sin(dec)*Math.sin(ra),Math.cos(dec)];
  var u=[g.x/dist,g.y/dist,g.z/dist];
  var rj=JUP_RADIUS_KM/KM_PER_AU;
  return GALILEAN.map(function(m){
    var v=jm[m.k];
    var east=(v.x*e[0]+v.y*e[1]+v.z*e[2])/rj;
    var north=(v.x*nn[0]+v.y*nn[1]+v.z*nn[2])/rj;
    var depth=(v.x*u[0]+v.y*u[1]+v.z*u[2])/rj;
    var proj=Math.hypot(east,north);
    var status=proj<1?(depth>0?'dietro Giove':'davanti a Giove'):'libera';
    return {name:m.name,color:m.color,east:east,north:north,depth:depth,status:status};
  });
}
function jupiterMoonsSVG(view){
  var W=360,rowH=24,H=rowH*4+6,cx=150,sc=3.1;
  var svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Posizione delle lune galileiane rispetto a Giove, Est a sinistra">';
  svg+='<rect x="'+(cx-sc).toFixed(1)+'" y="0" width="'+(2*sc).toFixed(1)+'" height="'+H+'" fill="rgba(242,184,75,0.28)"/>';
  view.forEach(function(m,i){
    var y=3+i*rowH+rowH/2;
    svg+='<line x1="62" y1="'+y+'" x2="250" y2="'+y+'" stroke="rgba(120,140,170,0.25)" stroke-width="1"/>';
    svg+='<text x="4" y="'+(y+4)+'" font-size="11" fill="currentColor">'+m.name+'</text>';
    var x=cx-m.east*sc;
    var hidden=m.status==='dietro Giove';
    svg+='<circle cx="'+x.toFixed(1)+'" cy="'+y+'" r="4.2" fill="'+(hidden?'none':m.color)+'" stroke="'+m.color+'" stroke-width="1.6"'+(hidden?' stroke-dasharray="2 2"':'')+'/>';
    var side=m.east>=0?'Est':'Ovest';
    var txt=side+' '+itn(Math.abs(m.east),1)+' Rj'+(m.status!=='libera'?' ('+(hidden?'dietro':'davanti')+')':'');
    svg+='<text x="'+(W-4)+'" y="'+(y+4)+'" font-size="10" text-anchor="end" fill="currentColor">'+txt+'</text>';
  });
  svg+='</svg>';
  return svg;
}
function jupiterMoonsBlockHTML(date){
  var view=jupiterMoonsView(date);
  return '<div class="planet-extra"><div class="pe-title">LUNE GALILEIANE ALLE '+fmtTime(date)+'</div>'
    +jupiterMoonsSVG(view)
    +'<div class="pe-note">Vista celeste: Est a sinistra. La fascia chiara è il disco di Giove, Rj è il raggio equatoriale di Giove. Il diagonale del C8 inverte destra e sinistra. L\'ombra delle lune sul disco non è calcolata.</div></div>';
}
function phaseWord(f){
  if(f<0.03) return 'quasi nuovo';
  if(f<0.40) return 'a falce';
  if(f<0.60) return 'a mezzo disco';
  if(f<0.97) return 'gibboso';
  return 'quasi pieno';
}
function planetPhaseBlockHTML(pKey,date){
  var body=A.Body[pKey];
  var il=A.Illumination(body,date);
  var el=A.Elongation(body,date);
  var evening=el.visibility==='evening';
  return '<div class="planet-extra"><div class="pe-title">FASE E ELONGAZIONE</div>'
    +'<div class="pe-flex"><div style="width:38px;flex:none">'+moonPhaseSVG(il.phase_fraction,evening,38)+'</div>'
    +'<div>Illuminato al <b>'+itn(il.phase_fraction*100,0)+'%</b>, '+phaseWord(il.phase_fraction)+'. Angolo di fase '+itn(il.phase_angle,0)+'°.<br>Elongazione <b>'+itn(el.elongation,0)+'°</b> dal Sole, a '+(evening?'Est del Sole (visibile la sera)':'Ovest del Sole (visibile al mattino)')+'.</div></div>'
    +'<div class="pe-note">Disegno schematico a occhio nudo, nord emisfero boreale. Nel telescopio con diagonale l\'immagine è speculare.</div></div>';
}
function saturnRingBlockHTML(date){
  var il=A.Illumination(A.Body.Saturn,date);
  var t=Math.abs(il.ring_tilt);
  var word=t<2?'quasi di taglio':(t<8?'poco aperti':(t<18?'mediamente aperti':'molto aperti'));
  var ry=Math.max(1.2,22*Math.sin(deg2rad(t)));
  var svg='<svg width="70" height="44" viewBox="0 0 70 44" aria-hidden="true"><ellipse cx="35" cy="22" rx="30" ry="'+ry.toFixed(1)+'" fill="none" stroke="#d9b26b" stroke-width="2.2"/><circle cx="35" cy="22" r="11" fill="#e6cf9a"/><path d="M5 22 A30 '+ry.toFixed(1)+' 0 0 0 65 22" fill="none" stroke="#d9b26b" stroke-width="2.6"/></svg>';
  return '<div class="planet-extra"><div class="pe-title">ANELLI DI SATURNO</div>'
    +'<div class="pe-flex"><div style="flex:none">'+svg+'</div><div>Inclinazione degli anelli <b>'+itn(t,1)+'°</b> rispetto alla linea di vista. Anelli '+word+'. Il massimo è circa 27°.</div></div>'
    +'<div class="pe-note">Un valore vicino a 0° indica anelli di taglio e quasi invisibili. Il disegno è schematico.</div></div>';
}
function planetExtraHTML(pKey,date){
  try{
    if(pKey==='Jupiter') return jupiterMoonsBlockHTML(date);
    if(pKey==='Venus'||pKey==='Mercury'||pKey==='Mars') return planetPhaseBlockHTML(pKey,date);
    if(pKey==='Saturn') return saturnRingBlockHTML(date);
  }catch(err){ /* dato non calcolabile */ }
  return '';
}

// ====================================================== M9: sicurezza Sole
var SUN_STOP_DEG = 20, SUN_CAUTION_DEG = 45;
function sunSafetyHTML(sep, sunState){
  if(!sunState || !sunState.isDay) return '';
  if(sep===null || sep===undefined) return '<span class="sun-safe amber">Sole sopra l\'orizzonte. Distanza dal Sole non calcolabile. '+DAY_SAFETY_NOTE+'</span>';
  var d=itn(sep,0);
  if(sep<SUN_STOP_DEG) return '<span class="sun-safe red">STOP. Il bersaglio dista '+d+'° dal Sole. Non puntare il telescopio. '+DAY_SAFETY_NOTE+'</span>';
  if(sep<SUN_CAUTION_DEG) return '<span class="sun-safe amber">Il bersaglio dista '+d+'° dal Sole. Muovi il telescopio con cautela e controlla che il Sole non entri nel cercatore. '+DAY_SAFETY_NOTE+'</span>';
  return '<span class="sun-safe green">Il bersaglio dista '+d+'° dal Sole. '+DAY_SAFETY_NOTE+'</span>';
}
