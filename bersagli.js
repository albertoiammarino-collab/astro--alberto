"use strict";
/* Astro Alberto. Elenco dei bersagli della notte e icone di fase. I dati non disponibili sono indicati come N/D e le stime non sono presentate come certezze. */
function applyFilterToTargets(f){
  var deepSkyActive = false;
  var deepSkyPanel = document.querySelector('.tab-panel[data-tab="deepsky"]');
  if(deepSkyPanel && deepSkyPanel.classList.contains('active')) deepSkyActive = true;
  document.querySelectorAll('#nightTargets .target-card').forEach(function(c){
    var k = c.dataset.kind;
    var hide = false;
    if(f === 'all'){
      if(deepSkyActive && k === 'planet') hide = true;
    } else {
      hide = (k !== f);
    }
    c.classList.toggle('hidden-target', hide);
  });
}
function computeMoonPenalty(target,obs,moonIllumFrac){
  if(!moonIllumFrac||moonIllumFrac<=0.4)return 0;
  var t=target.time;if(!t)return 0;
  var eqM=A.Equator(A.Body.Moon,t,obs,true,true);
  var horM=A.Horizon(t,obs,eqM.ra,eqM.dec,'normal');
  if(horM.altitude<25)return 0;
  var eqT=fixedEquatorial(target.fixedObj||target, t, obs); if(!eqT)return 0; var raT=eqT.ra*15*Math.PI/180;var decT=eqT.dec*Math.PI/180;
  var raM=eqM.ra*15*Math.PI/180;var decM=eqM.dec*Math.PI/180;
  var cosSep=Math.sin(decT)*Math.sin(decM)+Math.cos(decT)*Math.cos(decM)*Math.cos(raT-raM);
  var sepDeg=Math.acos(Math.max(-1,Math.min(1,cosSep)))*180/Math.PI;
  return sepDeg<30?1:0;
}
function resolveTarget(arg){
  if (typeof arg === 'string') {
    if (arg === 'Moon') return {
      kind:'moon', name:'Luna', body:A.Body.Moon, key:'Moon',
      url:'https://science.nasa.gov/moon/', simbad:simbadURL('Moon'), mag:null,
      distLy:null, massRatio:MOON_MASS_RATIO
    };
    if (arg === 'Sun') return {
      kind:'sun', name:'Sole', body:A.Body.Sun, key:'Sun',
      url:'https://science.nasa.gov/sun/', simbad:simbadURL('Sun'), mag:null,
      distLy:null, massRatio:'333.000 volte la Terra (1 volta il Sole)'
    };
    if (PLANET_DATA[arg]) return {
      kind:'planet', name:PLANET_DATA[arg].name, body:A.Body[arg], key:arg,
      url:PLANET_DATA[arg].url, simbad:simbadURL(arg), mag:null,
      distLy:null, massRatio:PLANET_DATA[arg].massRatio
    };
  }
  return arg;
}

function renderNightTargets(obs,tStart,tEnd,planetCandidates,moonInfo,sunState){
  var el=document.getElementById('nightTargets');
  if(!el)return;
  var out=[],now=new Date();
  var nightRef = new Date((tStart.getTime()+tEnd.getTime())/2);

  planetCandidates.forEach(function(p){
    var absCulm = absoluteCulmination(p.key, obs, nightRef, tStart, tEnd);
    var cur=currentAltAz(A.Body[p.key],obs,now);
    var observableNow=cur.isUp && isObservableUnderSun(sunState.alt, p.mag, p.key, obs, now);
    var culmAlt = absCulm ? absCulm.alt : p.maxAlt;
    var q = observabilityQuality(culmAlt);
    out.push({kind:'planet', name:p.name, alt:p.maxAlt, az:p.maxAz, time:p.maxTime, mag:p.mag,
      distObj:formatDistanceLines(p.distKm,false), massObj:formatMassLines(PLANET_DATA[p.key].massRatio),
      url:p.url, extra:getDynamicEyepieceAdvice(p.key,p.maxAlt,culmAlt), source:'Astronomy Engine + EduINAF',
      absCulm:absCulm, culmQuality:q.key, culmAlt:culmAlt,
      isUpNow:observableNow, isGeomUp:cur.isUp, desc:resolveTarget(p.key)});
  });

  STAR_CATALOG.forEach(function(s){
    var b=bestFixed(s,tStart,tEnd,obs);
    if(b.alt>=15){
      var absCulm = absoluteCulmination(s, obs, nightRef, tStart, tEnd);
      var horNow=fixedHorizon(s,now,obs);
      var observNow=horNow.altitude>0 && isObservableUnderSun(sunState.alt, s.mag, s, obs, now);
      var culmAlt = absCulm ? absCulm.alt : b.alt;
      var q = observabilityQuality(culmAlt);
      out.push({kind:'star', name:s.name, alt:b.alt, az:b.az, time:b.time, mag:s.mag, fixedObj:s,
        distObj:formatDistanceLines(0,true,s.distLy), massObj:formatMassLines(s.massRatio),
        url:s.url, extra:'25 mm (81x) per centrare, 15 mm (135x) per osservare', simbad:s.simbad,
        source:'EQJ J2000 → equatoriale della data + SIMBAD',
        absCulm:absCulm, culmQuality:q.key, culmAlt:culmAlt,
        isUpNow:observNow, isGeomUp:horNow.altitude>0,
        desc:{kind:'star', name:s.name, ra:s.ra, dec:s.dec, mag:s.mag, distLy:s.distLy, massRatio:s.massRatio, url:s.url, simbad:s.simbad}});
    }
  });

  DOUBLE_STARS.forEach(function(d){
    var b=bestFixed(d,tStart,tEnd,obs);
    if(b.alt>=15){
      var absCulm = absoluteCulmination(d, obs, nightRef, tStart, tEnd);
      var horNow=fixedHorizon(d,now,obs);
      var observNow=horNow.altitude>0 && isObservableUnderSun(sunState.alt, d.mag, d, obs, now);
      var culmAlt = absCulm ? absCulm.alt : b.alt;
      var q = observabilityQuality(culmAlt);
      var dd = doubleDesc(d);
      out.push({kind:'double', name:d.name, alt:b.alt, az:b.az, time:b.time, mag:d.mag, fixedObj:d, dbl:d,
        distObj:formatDistanceLines(0,true,null), massObj:null,
        url:d.url, extra:doubleEyepiece(d), simbad:dd.simbad,
        source:'Hipparcos + WDS',
        absCulm:absCulm, culmQuality:q.key, culmAlt:culmAlt,
        isUpNow:observNow, isGeomUp:horNow.altitude>0, desc:dd});
    }
  });

  MESSIER.forEach(function(m){
    var b=bestFixed(m,tStart,tEnd,obs);
    if(b.alt>=18){
      var absCulm = absoluteCulmination(m, obs, nightRef, tStart, tEnd);
      var horNow=fixedHorizon(m,now,obs);
      var observNow=horNow.altitude>0 && isObservableUnderSun(sunState.alt, m.mag, m, obs, now);
      var culmAlt = absCulm ? absCulm.alt : b.alt;
      var q = observabilityQuality(culmAlt);
      var simbadUrl='https://simbad.cds.unistra.fr/simbad/sim-id?Ident='+encodeURIComponent(m.id);
      var rec={kind:'deep', name:m.name, alt:b.alt, az:b.az, time:b.time, mag:m.mag, fixedObj:m,
        distObj:formatDistanceLines(0,true,m.distLy), massObj:formatMassLines('Dato non disponibile nel catalogo'),
        url:m.url, extra:m.mag<=5?'25 mm (81x), poi 15 mm (135x)':'25 mm (81x), cielo buio e visione distolta',
        simbad:simbadUrl, source:'EQJ J2000 → equatoriale della data + SIMBAD',
        absCulm:absCulm, culmQuality:q.key, culmAlt:culmAlt,
        isUpNow:observNow, isGeomUp:horNow.altitude>0,
        desc:{kind:'deep', name:m.name, ra:m.ra, dec:m.dec, mag:m.mag, distLy:m.distLy, url:m.url, simbad:simbadUrl}};
      rec.moonPenalty=computeMoonPenalty(rec,obs,moonInfo?moonInfo.illumFrac:0);
      out.push(rec);
    }
  });

  out.sort(compareTargets);

  var qBadgeClass = function(q){
    return q==='excellent'?'excellent':q==='good'?'good':q==='fair'?'fair':q==='poor'?'poor':'marginal';
  };
  var qLabel = function(q){
    return q==='excellent'?'ECCELLENTE':q==='good'?'BUONA':q==='fair'?'DISCRETA':q==='poor'?'MARGINALE':'NON OSSERVABILE';
  };

  el.innerHTML = out.map(function(x,idx){
    var visTag;
    if(x.isUpNow) visTag='<span class="tag good">'+(sunState.isDay?'VISIBILE DI GIORNO':'ORA VISIBILE')+'</span>';
    else if(x.isGeomUp&&sunState.isDay) visTag='<span class="tag day">SOPRA MA NON VISIBILE</span>';
    else if(x.isGeomUp) visTag='<span class="tag low">SOPRA (LUCE SOLARE)</span>';
    else visTag='<span class="tag no">SOTTO ORIZZONTE</span>';
    var moonWarn=x.moonPenalty?'<span class="moon-warn">Criterio orientativo: Luna illuminata &gt;40%, alt &gt;25° e separazione &lt;30°.</span>':'';
    if(x.isUpNow&&sunState.isDay) moonWarn+=sunSafetyHTML(x.desc?solarSeparationDegrees(x.desc,obs,now):null,sunState);
    var infoText=visTag+'<span>Verso <b>'+compassDir(x.az)+'</b> ('+Math.round(x.az)+'°), <b>'+Math.round(x.alt)+'°</b> sopra orizzonte alle <b>'+fmtTime(x.time)+'</b>.</span>'+magSpan(x.mag);

    var culmHtml = '';
    if(x.absCulm){
      var outsideClass = x.absCulm.inNightWindow ? '' : ' outside';
      var outsideNote = x.absCulm.inNightWindow ? '' : '<div class="culm-note">La culminazione assoluta cade fuori dalla finestra notturna: il picco realmente osservabile stanotte è alle '+fmtTime(x.time)+'.</div>';
      culmHtml = '<div class="culm-block'+outsideClass+'">'
        + '<div class="culm-row"><span class="k">Picco stanotte:</span><span class="v">'+fmtTime(x.time)+' a <b>'+Math.round(x.alt)+'°</b></span></div>'
        + '<div class="culm-row"><span class="k">Culmina a:</span><span class="v">'+fmtTime(x.absCulm.time)+' a <b>'+Math.round(x.absCulm.alt)+'°</b> <span class="culm-quality '+qBadgeClass(x.culmQuality)+'">'+qLabel(x.culmQuality)+'</span></span></div>'
        + outsideNote
        + '</div>';
    } else {
      culmHtml = '<div class="culm-block"><div class="culm-row"><span class="k">Picco stanotte:</span><span class="v">'+fmtTime(x.time)+' a <b>'+Math.round(x.alt)+'°</b></span></div>'
        + '<div class="culm-row"><span class="k">Culmina:</span><span class="v">N/D, evento non risolto</span></div></div>';
    }

    return '<div class="target-card" data-kind="'+x.kind+'" data-tidx="'+idx+'">'
      +'<div class="target-head"><span class="target-name">'+escapeHtml(x.name)+'</span><span class="target-score">max '+Math.round(x.alt)+'°</span></div>'
      +'<div class="target-info">'+infoText+'</div>'
      + culmHtml
      + metricsBlockHTML(x.distObj, x.massObj)
      +(x.kind==='double' && x.dbl ? '<div class="dbl-block"><div><b>Componenti:</b> '+escapeHtml(x.dbl.comp)+'</div><div><b>Separazione:</b> '+escapeHtml(x.dbl.sep)+(x.dbl.pa?' · <b>PA:</b> '+escapeHtml(x.dbl.pa):'')+'</div><div><b>Difficoltà:</b> '+escapeHtml(x.dbl.diff)+'</div><div class="dbl-note">'+escapeHtml(x.dbl.note)+'</div></div>' : '')
      +'<div class="target-c8">C8: '+x.extra+'</div>'+ moonWarn
      +'<div class="astrolinks">'
      +   (x.url?'<a href="'+x.url+'" target="_blank" rel="noopener">Scheda ↗</a>':'')
      +   (x.simbad?'<a href="'+x.simbad+'" target="_blank" rel="noopener">SIMBAD ↗</a>':'')
      +   '<button type="button" class="btn-ar-inline ar" data-ar-t="'+idx+'">📷 AR</button>'
      +   '<button type="button" class="btn-ar-inline radar" data-radar-t="'+idx+'">🧭 Radar</button>'
      +'</div>'
      +'<span class="source-pill">'+x.source+'</span></div>';
  }).join('')||'<div class="section-note">Nessun bersaglio del catalogo selezionato supera la quota minima.</div>';

  document.querySelectorAll('#nightTargets .target-card').forEach(function(card){
    var idx = parseInt(card.dataset.tidx,10);
    var item = out[idx];if(!item || !item.desc) return;
    card.addEventListener('click', function(e){if(e.target.closest('a,button')) return;openCelestialModal(item.desc);});
    var arBtn = card.querySelector('[data-ar-t]');if(arBtn) arBtn.addEventListener('click', function(e){ e.stopPropagation(); e.preventDefault(); startAR(item.desc); });
    var radarBtn = card.querySelector('[data-radar-t]');if(radarBtn) radarBtn.addEventListener('click', function(e){ e.stopPropagation(); e.preventDefault(); openRadar(item.desc); });
  });
  applyFilterToTargets(activeFilter);
  scheduleFitMetrics();
}
function compassSVG(azNow,altNow,size){
  var R=size/2-16,cx=size/2,cy=size/2;
  var rings=[0,30,60,90];
  var svg='<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">';
  rings.forEach(function(a){var rr=R*(1-a/90);svg+='<circle cx="'+cx+'" cy="'+cy+'" r="'+rr.toFixed(1)+'" fill="none" stroke="var(--line)" stroke-width="1"/>';});
  ["N","E","S","O"].forEach(function(dir,i){var ang=i*90*Math.PI/180;var x=cx-(R+10)*Math.sin(ang),y=cy-(R+10)*Math.cos(ang);svg+='<text x="'+x.toFixed(1)+'" y="'+(y+4).toFixed(1)+'" text-anchor="middle" font-family="ui-monospace,monospace" font-size="12" fill="var(--muted)">'+dir+'</text>';});
  if(altNow>0){
    var r=R*(1-altNow/90),ang2=azNow*Math.PI/180;
    var px=cx-r*Math.sin(ang2),py=cy-r*Math.cos(ang2);
    svg+='<line x1="'+cx+'" y1="'+cy+'" x2="'+px.toFixed(1)+'" y2="'+py.toFixed(1)+'" stroke="var(--amber)" stroke-width="1.2" opacity="0.6"/>';
    svg+='<circle cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="7" fill="var(--amber)"/>';
  } else {svg+='<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="rgba(231,76,60,0.08)"/>';}
  svg+='<circle cx="'+cx+'" cy="'+cy+'" r="2" fill="var(--muted-2)"/></svg>';
  return svg;
}
function moonPhaseSVG(f,waxing,size){
  var r=size/2-2,cx=size/2,cy=size/2;
  var svg='<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">';
  svg+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="#141f30" stroke="var(--line)"/>';
  if(f>0.008){
    var rx=r*Math.abs(1-2*f);var sweep1=waxing?1:0;var sweep2=(f<0.5)?(1-sweep1):sweep1;
    var path='M '+cx+' '+(cy-r)+' A '+r+' '+r+' 0 0 '+sweep1+' '+cx+' '+(cy+r)+' A '+rx.toFixed(2)+' '+r+' 0 0 '+sweep2+' '+cx+' '+(cy-r)+' Z';
    svg+='<path d="'+path+'" fill="var(--amber)"/>';
  }
  svg+='</svg>';
  return svg;
}
