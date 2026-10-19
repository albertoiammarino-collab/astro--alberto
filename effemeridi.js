"use strict";
/* Astro Alberto. Oggetti fissi, culminazioni, finestre notturne e cache dei calcoli (M8). I dati non disponibili sono indicati come N/D e le stime non sono presentate come certezze. */
function CON(ra,dec){var c=A.Constellation(ra,dec);return {name:CONIT[c.symbol]||c.name,symbol:c.symbol};}
function getFixedBody(obj){
  if(!obj || typeof obj.ra!=='number' || typeof obj.dec!=='number') return null;
  try{
    var dist=(typeof obj.distLy==='number' && isFinite(obj.distLy) && obj.distLy>=1)?obj.distLy:1000;
    A.DefineStar(A.Body.Star1,obj.ra,obj.dec,dist);
    return A.Body.Star1;
  }catch(e){return null;}
}
function fixedEquatorial(obj,date,obs){
  var body=getFixedBody(obj);
  if(!body)return null;
  return A.Equator(body,date,obs,true,true);
}
function fixedHorizon(obj,date,obs){
  var eq=fixedEquatorial(obj,date,obs);
  if(!eq)return null;
  return A.Horizon(date,obs,eq.ra,eq.dec,'normal');
}
function absoluteCulminationRaw(objOrBodyKey, obs, refTime, nightStart, nightEnd){
  var ref = refTime || new Date();
  var body = typeof objOrBodyKey === 'string' ? A.Body[objOrBodyKey] : getFixedBody(objOrBodyKey);
  if (!body) return null;

  function horizonAt(time){
    var eq = A.Equator(body, time, obs, true, true);
    return A.Horizon(time, obs, eq.ra, eq.dec, 'normal');
  }
  function recordAt(time){
    var h = horizonAt(time);
    return {time:time, alt:h.altitude, az:h.azimuth};
  }
  var best = null;
  try {
    var searchStart = addHours(ref, -20);
    var evt = A.SearchHourAngle(body, obs, 0, searchStart, 3);
    var candidates = [];
    var guard = 0;
    while (evt && evt.time && evt.time.date && guard < 7) {
      guard++;
      var t = evt.time.date;
      if (Math.abs(t.getTime() - ref.getTime()) <= 36 * 3600000) {
        candidates.push(evt.hor ? {time:t, alt:evt.hor.altitude, az:evt.hor.azimuth} : recordAt(t));
      }
      if (t > addHours(ref, 36)) break;
      evt = A.SearchHourAngle(body, obs, 0, addHours(t, 1), 3);
    }
    candidates.sort(function(a,b){ return Math.abs(a.time-ref)-Math.abs(b.time-ref); });
    if (candidates.length) best = candidates[0];
  } catch (err) { /* il campionamento sottostante è il ripiego */ }

  // Ripiego indipendente da SearchHourAngle, importante per stelle circumpolari e oggetti Messier.
  if (!best || !Number.isFinite(best.alt)) {
    var start = addHours(ref, -30), stepMs = 10 * 60000, count = Math.floor(60 * 3600000 / stepMs);
    var samples = [];
    for (var i = 0; i <= count; i++) {
      var time = new Date(start.getTime() + i * stepMs);
      try { samples.push(recordAt(time)); } catch (err) { samples.push(null); }
    }
    var peaks = [];
    for (var j = 1; j < samples.length - 1; j++) {
      var prev = samples[j - 1], cur = samples[j], next = samples[j + 1];
      if (prev && cur && next && cur.alt >= prev.alt && cur.alt >= next.alt) peaks.push(cur);
    }
    if (!peaks.length) {
      samples.forEach(function(item){ if (item && (!best || item.alt > best.alt)) best = item; });
    } else {
      peaks.sort(function(a,b){ return Math.abs(a.time-ref)-Math.abs(b.time-ref); });
      var peak = peaks[0];
      var lo = new Date(peak.time.getTime() - stepMs), hi = new Date(peak.time.getTime() + stepMs);
      // Ricerca aurea attorno al massimo campionato, risoluzione finale di pochi secondi.
      var gr = (Math.sqrt(5) - 1) / 2;
      var c = new Date(hi.getTime() - gr * (hi.getTime() - lo.getTime()));
      var d = new Date(lo.getTime() + gr * (hi.getTime() - lo.getTime()));
      var hc = recordAt(c), hd = recordAt(d);
      for (var k = 0; k < 24; k++) {
        if (hc.alt > hd.alt) {
          hi = d; d = c; hd = hc;
          c = new Date(hi.getTime() - gr * (hi.getTime() - lo.getTime())); hc = recordAt(c);
        } else {
          lo = c; c = d; hc = hd;
          d = new Date(lo.getTime() + gr * (hi.getTime() - lo.getTime())); hd = recordAt(d);
        }
      }
      best = hc.alt > hd.alt ? hc : hd;
    }
  }
  if (best && nightStart && nightEnd) best.inNightWindow = best.time >= nightStart && best.time <= nightEnd;
  else if (best) best.inNightWindow = null;
  return best;
}

function observabilityQuality(culmAlt){
  if(culmAlt === null || culmAlt === undefined) return {key:'marginal', label:'N/D'};
  if(culmAlt >= 60) return {key:'excellent', label:'ECCELLENTE'};
  if(culmAlt >= 40) return {key:'good',      label:'BUONA'};
  if(culmAlt >= 25) return {key:'fair',      label:'DISCRETA'};
  if(culmAlt >= 15) return {key:'poor',      label:'MARGINALE'};
  return                    {key:'marginal', label:'NON OSSERVABILE'};
}

function getSunState(obs, t){
  var eq = A.Equator(A.Body.Sun, t, obs, true, true);
  var hor = A.Horizon(t, obs, eq.ra, eq.dec);
  var alt = hor.altitude;
  return {alt:alt, isUp:alt>0, isDay:alt>-0.833, isCivilTwilight:alt<=-0.833&&alt>-6, isNauticalTwilight:alt<=-6&&alt>-12, isAstronomicalTwilight:alt<=-12&&alt>-18, isNight:alt<=-18};
}
function getNightWindowRaw(obs,anchorDate){
  var base=obsNoon(anchorDate);
  var sunset=A.SearchRiseSet(A.Body.Sun,obs,-1,base,1);
  var sunrise=A.SearchRiseSet(A.Body.Sun,obs,+1,sunset?sunset.date:base,1);
  return {start:sunset?sunset.date:base, end:sunrise?sunrise.date:addHours(base,12)};
}
function getAstroDarkWindowRaw(obs,anchorDate){
  var win=getNightWindow(obs,anchorDate);
  var dusk=A.SearchAltitude(A.Body.Sun,obs,-1,win.start,1,-18);
  var dawn=dusk?A.SearchAltitude(A.Body.Sun,obs,+1,dusk.date,1,-18):null;
  return {start:dusk?dusk.date:null, end:dawn?dawn.date:null, sunset:win.start, sunrise:win.end};
}
function getBodyCycleRaw(body,obs,refTime,limitDays){
  var lim=limitDays||2;
  var winStart=addHours(refTime,-12),winEnd=addHours(refTime,+12);
  var riseEvt=A.SearchRiseSet(body,obs,+1,winStart,lim);
  var setEvt=A.SearchRiseSet(body,obs,-1,winStart,lim);
  var rise=(riseEvt&&riseEvt.date>=winStart&&riseEvt.date<=winEnd)?riseEvt.date:null;
  var set=(setEvt&&setEvt.date>=winStart&&setEvt.date<=winEnd)?setEvt.date:null;
  var pts=[],samples=48;
  var totalH=hoursBetween(winStart,winEnd);
  var peak={alt:-90,az:0,t:winStart};
  var transit=null;
  try{var tr=A.SearchHourAngle(body,obs,0,winStart,1);if(tr&&tr.time&&tr.time.date>=winStart&&tr.time.date<=winEnd)transit=tr.time.date;}catch(e){}
  if(transit){
    var eqT=A.Equator(body,transit,obs,true,true);
    var horT=A.Horizon(transit,obs,eqT.ra,eqT.dec,'normal');
    peak={alt:horT.altitude,az:horT.azimuth,t:transit};
  }
  for(var i=0;i<=samples;i++){
    var t=addHours(winStart,totalH*i/samples);
    var eq=A.Equator(body,t,obs,true,true);
    var hor=A.Horizon(t,obs,eq.ra,eq.dec,'normal');
    pts.push({t:t, alt:hor.altitude, az:hor.azimuth});
    if(!transit && hor.altitude>peak.alt) peak={alt:hor.altitude,az:hor.azimuth,t:t};
  }
  return {rise:rise, set:set, peak:peak, transit:transit, pts:pts, win:{start:winStart,end:winEnd}};
}
function currentAltAz(body, obs, now){
  var eq  = A.Equator(body, now, obs, true, true);
  var hor = A.Horizon(now, obs, eq.ra, eq.dec, 'normal');
  return {eq:eq, hor:hor, isUp:hor.altitude > 0};
}
function sparkSVG(pts,now,win,riseDate,peakDate,setDate,isVisibleNow,isToday){
  var W=380,H=84,padX=8,padTop=14,padBottom=16;
  var t0=win.start.getTime(),t1=win.end.getTime();
  function x(t){return padX+(W-2*padX)*((t-t0)/(t1-t0));}
  var maxAlt=0;for(var k=0;k<pts.length;k++){if(pts[k].alt>maxAlt)maxAlt=pts[k].alt;}
  var altMin=-20;var altMax=maxAlt<30?40:90;var plotH=H-padTop-padBottom;
  function y(alt){return (padTop+plotH)-plotH*((alt-altMin)/(altMax-altMin));}
  var horizonY=y(0);
  var d=pts.map(function(p,i){return (i===0?"M":"L")+x(p.t.getTime()).toFixed(1)+","+y(p.alt).toFixed(1);}).join(" ");
  var fillD=d+" L"+x(t1).toFixed(1)+","+(padTop+plotH)+" L"+x(t0).toFixed(1)+","+(padTop+plotH)+" Z";
  var solidSegs="",dashSegs="";
  for(var i=0;i<pts.length-1;i++){
    var p1=pts[i],p2=pts[i+1];
    var x1=x(p1.t.getTime()),x2=x(p2.t.getTime());
    if(p1.alt>=0&&p2.alt>=0){solidSegs+='<line x1="'+x1.toFixed(1)+'" y1="'+horizonY.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+horizonY.toFixed(1)+'" stroke="var(--green)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>';}
    else if(p1.alt<0&&p2.alt<0){dashSegs+='<line x1="'+x1.toFixed(1)+'" y1="'+horizonY.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+horizonY.toFixed(1)+'" stroke="var(--green)" stroke-width="1.4" stroke-dasharray="4,3" vector-effect="non-scaling-stroke"/>';}
    else{var frac=(0-p1.alt)/(p2.alt-p1.alt);var xC=x1+(x2-x1)*frac;
      if(p1.alt>=0){solidSegs+='<line x1="'+x1.toFixed(1)+'" y1="'+horizonY.toFixed(1)+'" x2="'+xC.toFixed(1)+'" y2="'+horizonY.toFixed(1)+'" stroke="var(--green)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>';dashSegs+='<line x1="'+xC.toFixed(1)+'" y1="'+horizonY.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+horizonY.toFixed(1)+'" stroke="var(--green)" stroke-width="1.4" stroke-dasharray="4,3" vector-effect="non-scaling-stroke"/>';}
      else{dashSegs+='<line x1="'+x1.toFixed(1)+'" y1="'+horizonY.toFixed(1)+'" x2="'+xC.toFixed(1)+'" y2="'+horizonY.toFixed(1)+'" stroke="var(--green)" stroke-width="1.4" stroke-dasharray="4,3" vector-effect="non-scaling-stroke"/>';solidSegs+='<line x1="'+xC.toFixed(1)+'" y1="'+horizonY.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+horizonY.toFixed(1)+'" stroke="var(--green)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>';}
    }
  }
  var eventTicks="";
  function addTick(dObj,color){if(!dObj)return;var tTime=dObj.getTime();if(tTime>=t0&&tTime<=t1){var tx=x(tTime).toFixed(1);eventTicks+='<line x1="'+tx+'" y1="'+(padTop+plotH-3)+'" x2="'+tx+'" y2="'+(padTop+plotH+4)+'" stroke="'+color+'" stroke-width="1.5"/>';}}
  addTick(riseDate,"var(--green)");addTick(peakDate,"var(--cyan)");addTick(setDate,"var(--red)");
  var nowMark="";
  if(isToday){
    var nowX=x(now.getTime());
    var c=Math.max(padX,Math.min(W-padX,nowX)).toFixed(1);
    var b=Math.max(34,Math.min(W-34,nowX)).toFixed(1);
    nowMark='<line x1="'+c+'" y1="'+padTop+'" x2="'+c+'" y2="'+(padTop+plotH)+'" stroke="var(--amber)" stroke-width="2" stroke-dasharray="3,2" vector-effect="non-scaling-stroke"/>'
      +'<circle cx="'+c+'" cy="'+(padTop+plotH)+'" r="3" fill="var(--amber)"/>'
      +'<rect x="'+(b-28)+'" y="1" width="56" height="13" rx="3" fill="#070c16" stroke="var(--amber)" stroke-width="1.2"/>'
      +'<text x="'+b+'" y="10.5" text-anchor="middle" font-family="ui-monospace,monospace" font-size="9" font-weight="700" fill="var(--amber)">ORA '+fmtTime(now)+'</text>';
  }
  var strokeColor=isVisibleNow?"var(--cyan)":"#3a567c";
  var fillColor=isVisibleNow?"rgba(81,160,213,0.15)":"rgba(81,160,213,0.05)";
  var zeroLabelX=8,zeroLabelAnchor="start";
  if(isToday&&x(now.getTime())>W/2){zeroLabelX=W-8;zeroLabelAnchor="end";}
  return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet">'
    +'<rect x="0" y="'+horizonY.toFixed(1)+'" width="'+W+'" height="'+(padTop+plotH-horizonY)+'" fill="rgba(6,11,21,0.65)"/>'
    +dashSegs+solidSegs
    +'<text x="'+zeroLabelX+'" y="'+(horizonY-3).toFixed(1)+'" text-anchor="'+zeroLabelAnchor+'" font-family="ui-monospace,monospace" font-size="9" font-weight="700" fill="var(--green)">0°</text>'
    +'<path d="'+fillD+'" fill="'+fillColor+'" stroke="none"/>'
    +'<path d="'+d+'" fill="none" stroke="'+strokeColor+'" stroke-width="2" vector-effect="non-scaling-stroke"/>'
    +eventTicks+nowMark
    +'<text x="'+padX+'" y="'+(H-2)+'" text-anchor="start" font-family="ui-monospace,monospace" font-size="8" fill="var(--muted-2)">'+fmtTime(win.start)+'</text>'
    +'<text x="'+(W-padX)+'" y="'+(H-2)+'" text-anchor="end" font-family="ui-monospace,monospace" font-size="8" fill="var(--muted-2)">'+fmtTime(win.end)+'</text>'
    +'</svg>';
}
function magCategory(mag){if(mag<=0)return"molto brillante";if(mag<=4.5)return"brillante";if(mag<=6)return"debole";return"poco brillante";}
function altCategory(maxAlt){
  if(maxAlt<=0)return{tag:"no",chip:"sotto orizzonte",label:"non sorge",dim:true};
  if(maxAlt<15)return{tag:"low",chip:"molto basso",label:"molto basso, turbolenza forte",dim:true};
  if(maxAlt<30)return{tag:"low",chip:"basso",label:"basso in cielo",dim:false};
  return{tag:"good",chip:"ottimo",label:"buona altezza in cielo",dim:false};
}
function getDynamicEyepieceAdvice(key, alt, culmAlt){
  var effectiveAlt = (typeof culmAlt === 'number' && culmAlt > alt) ? culmAlt : alt;
  if(effectiveAlt < 15){
    return "Bersaglio basso sull'orizzonte: inizia con il 25 mm originale (81x), l'Hyperion a 24 mm (~85x) o lo SVBONY a 21 mm (~97x). L'atmosfera vicino all'orizzonte limita i dettagli.";
  }
  if(key==="Moon"){
    return "Luna: prova l'Hyperion tra 12 e 16 mm (~127-169x) o lo SVBONY tra 12 e 15 mm (~135-169x). Per dettagli fini scendi verso 10 mm (~203x). Le combinazioni con Barlow (es. 25 mm + Barlow = 163x) funzionano bene se il seeing è buono.";
  }
  if(key==="Jupiter"||key==="Saturn"||key==="Mars"){
    return "Pianeti: inizia con Hyperion 12-16 mm (~127-169x) o SVBONY 12-15 mm (~135-169x). Prova 10 mm (~203x) se il bordo resta nitido. Barlow + 25 mm (163x) e Barlow + SVBONY 21 mm (194x) sono combo utili.";
  }
  if(key==="Uranus"||key==="Neptune"){
    return "Urano/Nettuno: centra prima con 25 mm o Hyperion 24 mm (~85x). Poi prova 12 mm (~169x) e 10 mm (~203x). Gli ingrandimenti maggiori rendono il disco più grande ma raramente aggiungono dettagli.";
  }
  return "Per centrare usa il 25 mm originale (81x) o l'Hyperion a 24 mm (~85x). Poi regola lo zoom in base al bersaglio e alla stabilità dell'immagine. Barlow + 25 mm (163x) è una buona alternativa intermedia.";
}

function bestFixedRaw(obj,tStart,tEnd,obs){
  var best={alt:-90,az:0,time:tStart};
  var transit=fixedTransitLocal(obj,obs,tStart,tEnd);
  if(transit){var ht=fixedHorizon(obj,transit,obs);if(ht)best={alt:ht.altitude,az:ht.azimuth,time:transit};}
  for(var i=0;i<=48;i++){
    var d=new Date(tStart.getTime()+(tEnd-tStart)*i/48);
    var hor=fixedHorizon(obj,d,obs);
    if(hor && hor.altitude>best.alt) best={alt:hor.altitude,az:hor.azimuth,time:d};
  }
  return best;
}
function fixedTransitLocalRaw(obj,obs,tStart,tEnd){
  var body=getFixedBody(obj);
  if(!body)return null;
  try{
    var evt=A.SearchHourAngle(body,obs,0,tStart,1);
    if(evt&&evt.time&&evt.time.date>=tStart&&evt.time.date<=tEnd)return evt.time.date;
  }catch(e){}
  return null;
}
function bestBodyRaw(body,obs,t0,t1){
  var b={alt:-90,az:0,time:t0};
  for(var i=0;i<=48;i++){
    var d=new Date(t0.getTime()+(t1-t0)*i/48);
    var e=A.Equator(body,d,obs,true,true);
    var h=A.Horizon(d,obs,e.ra,e.dec,'normal');
    if(h.altitude>b.alt)b={alt:h.altitude,az:h.azimuth,time:d};
  }
  return b;
}
// ====================================================== M8: cache dei calcoli notturni
// I risultati dipendono solo da località, notte e istanti passati come argomenti.
// La cache vale per una notte e una località. Cambiando una delle due si azzera.
// Ogni minuto si ricalcolano soltanto i valori legati all'ora attuale.
var calcCache = {ctx:null, map:Object.create(null), hits:0, misses:0};
function calcCtxKey(obs){
  return Number(obs.latitude).toFixed(4) + '|' + Number(obs.longitude).toFixed(4) + '|' + Math.round(obs.height) + '|' + obsNoon(activeDate).getTime();
}
function calcObjKey(o){
  if (typeof o === 'string') return o;
  if (!o) return 'null';
  return (o.id || o.key || o.name || '') + '@' + o.ra + ',' + o.dec + ',' + (o.distLy || '');
}
function memoCalc(tag, parts, obs, fn){
  var ck = calcCtxKey(obs);
  if (calcCache.ctx !== ck) { calcCache.ctx = ck; calcCache.map = Object.create(null); }
  var k = tag + '|' + parts.join('|');
  if (k in calcCache.map) { calcCache.hits++; return calcCache.map[k]; }
  calcCache.misses++;
  var v = fn();
  calcCache.map[k] = v;
  return v;
}
function calcT(d){ return d ? d.getTime() : 'n'; }
function getNightWindow(obs,anchorDate){
  return memoCalc('nw', [obsNoon(anchorDate).getTime()], obs, function(){ return getNightWindowRaw(obs,anchorDate); });
}
function getAstroDarkWindow(obs,anchorDate){
  return memoCalc('ad', [obsNoon(anchorDate).getTime()], obs, function(){ return getAstroDarkWindowRaw(obs,anchorDate); });
}
function getBodyCycle(body,obs,refTime,limitDays){
  return memoCalc('bc', [String(body), calcT(refTime), limitDays || 2], obs, function(){ return getBodyCycleRaw(body,obs,refTime,limitDays); });
}
function absoluteCulmination(objOrBodyKey, obs, refTime, nightStart, nightEnd){
  if (!refTime) return absoluteCulminationRaw(objOrBodyKey, obs, refTime, nightStart, nightEnd);
  return memoCalc('ac', [calcObjKey(objOrBodyKey), calcT(refTime), calcT(nightStart), calcT(nightEnd)], obs, function(){ return absoluteCulminationRaw(objOrBodyKey, obs, refTime, nightStart, nightEnd); });
}
function bestFixed(obj,tStart,tEnd,obs){
  return memoCalc('bf', [calcObjKey(obj), calcT(tStart), calcT(tEnd)], obs, function(){ return bestFixedRaw(obj,tStart,tEnd,obs); });
}
function fixedTransitLocal(obj,obs,tStart,tEnd){
  return memoCalc('ft', [calcObjKey(obj), calcT(tStart), calcT(tEnd)], obs, function(){ return fixedTransitLocalRaw(obj,obs,tStart,tEnd); });
}
function bestBody(body,obs,t0,t1){
  return memoCalc('bb', [String(body), calcT(t0), calcT(t1)], obs, function(){ return bestBodyRaw(body,obs,t0,t1); });
}
function compareTargets(a,b){
  if(a.isUpNow!==b.isUpNow)return a.isUpNow?-1:1;
  var qa = a.culmQuality ? ({excellent:0, good:1, fair:2, poor:3, marginal:4})[a.culmQuality] : 5;
  var qb = b.culmQuality ? ({excellent:0, good:1, fair:2, poor:3, marginal:4})[b.culmQuality] : 5;
  if(qa !== qb) return qa - qb;
  var magA=(typeof a.mag==='number')?a.mag:99;var magB=(typeof b.mag==='number')?b.mag:99;
  if(magA!==magB)return magA-magB;
  return (b.alt||0)-(a.alt||0);
}
