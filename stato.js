"use strict";
/* Astro Alberto. Stato, memoria locale, tempo, declinazione magnetica, orientamento, utilità e formattazione. I dati non disponibili sono indicati come N/D e le stime non sono presentate come certezze. */
var A = (typeof Astronomy !== 'undefined') ? Astronomy : null;
var loc = {lat:40.6947, lon:14.4803, elev:6, name:"Castellammare di Stabia", elevSource:"default"};
var weatherLoaded = false;
var activeFilter = 'all';
var weatherFetchToken = 0;
var geocodeFetchToken = 0;
var navBusy = false;
var currentWeatherContext = {clouds:null, jetSpeed:null, jetAvailable:false};
var KM_PER_LY = 9.460730472e12;
var KM_PER_AU = 149597870.7;
var COMPASS = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSO","SO","OSO","O","ONO","NO","NNO"];
var arState = {stream:null, headingHandler:null, timer:null};
var phonePitch = null, phoneHeading = null;
var headingSource = null, orientationSeen = false, orientationIssue = null;
var phoneRawAlpha = null, phoneRawBeta = null, phoneRawGamma = null;
function safeGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function safeSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
var arCalibAz  = parseFloat(safeGet('astroalert_ar_calib_az')  || '0') || 0;
var arCalibAlt = parseFloat(safeGet('astroalert_ar_calib_alt') || '0') || 0;
var OBS_TIMEZONE = 'Europe/Rome';
function saveLocation(){
  safeSet('astroalert_loc', JSON.stringify({lat:loc.lat, lon:loc.lon, elev:loc.elev, name:loc.name, tz:OBS_TIMEZONE, elevSource:loc.elevSource}));
}
function loadSavedLocation(){
  try {
    var o = JSON.parse(safeGet('astroalert_loc') || 'null');
    if (o && Number.isFinite(o.lat) && Number.isFinite(o.lon) && Math.abs(o.lat) <= 90 && Math.abs(o.lon) <= 180) {
      loc.lat = o.lat; loc.lon = o.lon;
      loc.elev = Number.isFinite(o.elev) ? o.elev : 0;
      loc.name = typeof o.name === 'string' && o.name ? o.name : 'Posizione salvata';
      loc.elevSource = typeof o.elevSource === 'string' ? o.elevSource : 'default';
      if (typeof o.tz === 'string') {
        try { new Intl.DateTimeFormat('it-IT', {timeZone:o.tz}); OBS_TIMEZONE = o.tz; } catch (err) { /* fuso non valido: resta il predefinito */ }
      }
    }
  } catch (err) { /* nessuna località salvata */ }
}
loadSavedLocation();
function deviceTimeZone(){
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (err) { return null; }
}
function fetchJSONTimeout(url, ms, opts){
  var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  var timer = controller ? setTimeout(function(){ controller.abort(); }, ms || 12000) : null;
  var o = Object.assign({}, opts || {});
  if (controller) o.signal = controller.signal;
  return fetch(url, o)
    .then(function(res){ if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(function(data){ if (timer) clearTimeout(timer); return data; },
          function(err){ if (timer) clearTimeout(timer); throw err; });
}

function obsDateParts(d){
  var parts=new Intl.DateTimeFormat('en-CA',{timeZone:OBS_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(d);
  var o={};parts.forEach(function(p){if(p.type!=='literal')o[p.type]=p.value;});
  return o;
}
function obsOffsetMinutes(d){
  var p=obsDateParts(d);
  var asUTC=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
  return (asUTC-d.getTime())/60000;
}
function obsLocalToUTC(year,month,day,hour,minute){
  var utcGuess=Date.UTC(year,month-1,day,hour,minute,0);
  var off1=obsOffsetMinutes(new Date(utcGuess));
  var t1=utcGuess-off1*60000;
  var off2=obsOffsetMinutes(new Date(t1));
  if(off2!==off1){t1=utcGuess-off2*60000;}
  return new Date(t1);
}
function obsNoon(d){var p=obsDateParts(d);return obsLocalToUTC(+p.year,+p.month,+p.day,12,0);}
function obsMidnight(d){var p=obsDateParts(d);return obsLocalToUTC(+p.year,+p.month,+p.day,0,0);}
function obsHour(d){return +obsDateParts(d).hour;}
function obsNowActiveDate(){
  var now=new Date();
  var midnight=obsMidnight(now);
  if(obsHour(now)<12){
    var before=true;
    try{
      var o=new A.Observer(loc.lat,loc.lon,loc.elev);
      var e=A.Equator(A.Body.Sun,now,o,true,true);
      before=A.Horizon(now,o,e.ra,e.dec).altitude<=-0.833;
    }catch(x){}
    if(before) midnight=obsMidnight(new Date(obsNoon(now).getTime()-86400000));
  }
  return midnight;
}
function obsDaysFromToday(d){
  return Math.round((obsNoon(d)-obsNoon(obsNowActiveDate()))/86400000);
}
function sameObsDay(a,b){
  var pa=obsDateParts(a),pb=obsDateParts(b);
  return pa.year===pb.year && pa.month===pb.month && pa.day===pb.day;
}
function obsDateFmt(opts){
  var o=opts||{weekday:'long',day:'numeric',month:'long',year:'numeric'};
  o.timeZone=OBS_TIMEZONE;
  return new Intl.DateTimeFormat('it-IT',o);
}

var activeDate = obsNowActiveDate();

var OBS_MAG_DECL = null;
var OBS_MAG_DECL_STATE = 'in attesa';
var declinationFetchToken = 0;
var WMM_VALID_FROM = '2025-01-01';
var WMM_VALID_TO = '2029-12-31';
function declinationCacheKey(lat, lon){
  return 'astro_wmm2025_' + Number(lat).toFixed(3) + '_' + Number(lon).toFixed(3);
}
function parseDeclinationResponse(text, contentType){
  if (!text || typeof text !== 'string') return null;
  // Il servizio NOAA restituisce XML o CSV, a seconda del formato richiesto.
  try {
    if (/xml/i.test(contentType) || /^\s*</.test(text)) {
      var xml = new DOMParser().parseFromString(text, 'application/xml');
      if (!xml.querySelector('parsererror')) {
        var nodes = Array.from(xml.getElementsByTagName('*'));
        for (var i = 0; i < nodes.length; i++) {
          var name = String(nodes[i].localName || nodes[i].nodeName).toLowerCase().replace(/[^a-z]/g, '');
          if (name === 'declination' || name === 'declinationangle' || name === 'declinationdeg') {
            var v = Number(String(nodes[i].textContent || '').trim().replace(',', '.'));
            if (Number.isFinite(v) && Math.abs(v) <= 180) return v;
          }
        }
      }
    }
  } catch (err) { /* prova il formato CSV */ }
  var lines = text.trim().split(/\r?\n/).map(function(line){ return line.trim(); }).filter(Boolean);
  if (lines.length >= 2) {
    var headers = lines[0].split(/[;,]/).map(function(x){ return x.trim().toLowerCase().replace(/[^a-z]/g, ''); });
    var idx = headers.findIndex(function(x){ return x === 'declination' || x === 'declinationdeg' || x === 'd'; });
    if (idx >= 0) {
      var cells = lines[lines.length - 1].split(/[;,]/).map(function(x){ return x.trim().replace(/^"|"$/g, ''); });
      var n = Number(cells[idx].replace(',', '.'));
      if (Number.isFinite(n) && Math.abs(n) <= 180) return n;
    }
  }
  return null;
}
function fetchMagneticDeclination(){
  var lat = Number(loc.lat), lon = Number(loc.lon);
  var token = ++declinationFetchToken;
  OBS_MAG_DECL = null;
  OBS_MAG_DECL_STATE = 'calcolo online in corso';
  var now = new Date();
  var modelDate = now.toISOString().slice(0, 10);
  if (modelDate < WMM_VALID_FROM || modelDate > WMM_VALID_TO) {
    OBS_MAG_DECL_STATE = 'WMM2025 fuori validità. Aggiorna il modello';
    try { updateAstroDebug(new A.Observer(loc.lat, loc.lon, loc.elev)); } catch (err) {}
    return Promise.resolve();
  }
  var cacheKey = declinationCacheKey(lat, lon);
  try {
    var cached = JSON.parse(safeGet(cacheKey) || 'null');
    if (cached && Number.isFinite(cached.value) && cached.value >= -180 && cached.value <= 180 && Date.now() - cached.savedAt < 30 * 86400000) {
      OBS_MAG_DECL = cached.value;
      OBS_MAG_DECL_STATE = 'ultimo dato WMM2025 salvato, ' + new Date(cached.savedAt).toLocaleDateString('it-IT');
    }
  } catch (err) { /* cache non disponibile */ }
  var query = new URLSearchParams({
    lat1: String(lat), lon1: String(lon), model: 'WMM', key: 'zNEw7',
    startYear: String(now.getUTCFullYear()),
    startMonth: String(now.getUTCMonth() + 1),
    startDay: String(now.getUTCDate()), resultFormat: 'xml'
  });
  var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  var timeoutId = controller ? setTimeout(function(){ controller.abort(); }, 12000) : null;
  return fetch('https://www.ngdc.noaa.gov/geomag-web/calculators/calculateDeclination?' + query.toString(), {
    cache:'no-store', signal:controller ? controller.signal : undefined
  })
    .then(function(res){ if (!res.ok) throw new Error('Servizio WMM non disponibile'); return res.text().then(function(text){ return {text:text, type:res.headers.get('content-type') || ''}; }); })
    .then(function(result){
      if (timeoutId) clearTimeout(timeoutId);
      if (token !== declinationFetchToken) return;
      var value = parseDeclinationResponse(result.text, result.type);
      if (value === null) throw new Error('Risposta WMM non interpretabile');
      OBS_MAG_DECL = value;
      OBS_MAG_DECL_STATE = 'WMM2025 NOAA, aggiornato ' + now.toLocaleDateString('it-IT');
      safeSet(cacheKey, JSON.stringify({value:value, savedAt:Date.now()}));
      updateAstroDebug(new A.Observer(loc.lat, loc.lon, loc.elev));
    })
    .catch(function(){
      if (timeoutId) clearTimeout(timeoutId);
      if (token !== declinationFetchToken) return;
      if (OBS_MAG_DECL === null) OBS_MAG_DECL_STATE = 'non disponibile. Puntamento AR non certificato';
      updateAstroDebug(new A.Observer(loc.lat, loc.lon, loc.elev));
    });
}
function updateMagDecl(){
  OBS_MAG_DECL = null;
  OBS_MAG_DECL_STATE = 'in attesa';
  return fetchMagneticDeclination();
}

function wrap360(value){ return ((value % 360) + 360) % 360; }
// Nord dell'evento "orientation assoluto" su Android: magnetico (predefinito, da verificare in campo con la Polare) o geografico.
function androidNorthMode(){ return safeGet('astroalert_android_north') === 'true' ? 'true' : 'magnetic'; }
// Elabora un evento di orientamento e aggiorna direzione e inclinazione dell'asse della fotocamera posteriore.
// Usata da AR e radar, così la correzione di declinazione è identica.
function processOrientationEvent(e){
  orientationSeen = true;
  phoneRawAlpha = typeof e.alpha === 'number' ? e.alpha : null;
  phoneRawBeta = typeof e.beta === 'number' ? e.beta : null;
  phoneRawGamma = typeof e.gamma === 'number' ? e.gamma : null;
  var nextHeading = null, nextPitch = null, nextSource = null, issue = null;
  var hasTilt = typeof e.beta === 'number' && Number.isFinite(e.beta)
    && typeof e.gamma === 'number' && Number.isFinite(e.gamma);
  var isIOSCompass = typeof e.webkitCompassHeading === 'number' && Number.isFinite(e.webkitCompassHeading);
  var isAbsolute = e.absolute === true || e.type === 'deviceorientationabsolute';
  var alphaForMatrix = null, magneticInput = false;
  if (hasTilt && isIOSCompass) {
    // iOS: bussola magnetica. Serve la declinazione WMM per ottenere il nord geografico.
    if (OBS_MAG_DECL !== null) {
      alphaForMatrix = wrap360(360 - e.webkitCompassHeading) * Math.PI / 180;
      magneticInput = true;
      nextSource = 'magnetic-corrected';
    } else issue = 'decl';
  } else if (hasTilt && typeof e.alpha === 'number' && Number.isFinite(e.alpha) && isAbsolute) {
    if (androidNorthMode() === 'true') {
      alphaForMatrix = e.alpha * Math.PI / 180;
      nextSource = 'absolute-true';
    } else if (OBS_MAG_DECL !== null) {
      alphaForMatrix = e.alpha * Math.PI / 180;
      magneticInput = true;
      nextSource = 'magnetic-corrected';
    } else issue = 'decl';
  }
  if (alphaForMatrix !== null) {
    var betaRad = e.beta * Math.PI / 180, gammaRad = e.gamma * Math.PI / 180;
    var ca = Math.cos(alphaForMatrix), sa = Math.sin(alphaForMatrix);
    var cb = Math.cos(betaRad), sb = Math.sin(betaRad);
    var cg = Math.cos(gammaRad), sg = Math.sin(gammaRad);
    // Asse della fotocamera posteriore nel riferimento Est, Nord, Alto.
    var east = -ca * sg - sa * sb * cg;
    var north = -sa * sg + ca * sb * cg;
    var up = -cb * cg;
    var horizontal = Math.hypot(east, north);
    if (Number.isFinite(east) && Number.isFinite(north) && Number.isFinite(up) && horizontal > 0.025) {
      nextHeading = wrap360(Math.atan2(east, north) * 180 / Math.PI + (magneticInput ? OBS_MAG_DECL : 0));
      nextPitch = Math.asin(Math.max(-1, Math.min(1, up))) * 180 / Math.PI;
    }
  }
  if (nextHeading !== null && Number.isFinite(nextHeading) && nextPitch !== null && Number.isFinite(nextPitch)) {
    phoneHeading = nextHeading; phonePitch = nextPitch; headingSource = nextSource; orientationIssue = null;
  } else if (isAbsolute || isIOSCompass) {
    phoneHeading = null; phonePitch = null; headingSource = null; orientationIssue = issue;
  }
  // Gli eventi relativi non sovrascrivono l'ultimo orientamento assoluto valido.
}
function compassStatusText(){
  if (phoneHeading !== null) return 'Direzione del telefono: ' + Math.round(phoneHeading) + '° (' + compassDir(phoneHeading) + '), nord geografico'
    + (headingSource === 'absolute-true' ? ' (sensore, impostazione Info)' : ' (corretto con WMM)') + '.';
  if (!orientationSeen) return 'Bussola: in attesa dei dati dai sensori.';
  if (orientationIssue === 'decl') return 'Bussola magnetica attiva ma declinazione WMM non disponibile: direzione del telefono non mostrata.';
  return 'Bussola non disponibile, oppure telefono quasi orizzontale.';
}

function sunAltThreshold(mag){
  // Soglie conservative di visibilità indicative, non un modello fotometrico.
  if (typeof mag !== 'number' || !Number.isFinite(mag)) return -18;
  if (mag <= 0.5) return -0.833;
  if (mag <= 2.0) return -6;
  if (mag <= 4.0) return -12;
  return -18;
}
function solarSeparationDegrees(target, obs, when){
  if (!target || !obs || !(when instanceof Date) || !Number.isFinite(when.getTime())) return null;
  try {
    var body = null;
    if (typeof target === 'string' && A.Body[target]) body = A.Body[target];
    else if (target && target.body) body = target.body;
    else if (target && target.key && A.Body[target.key]) body = A.Body[target.key];
    var targetEq = body ? A.Equator(body, when, obs, true, true) : fixedEquatorial(target, when, obs);
    var sunEq = A.Equator(A.Body.Sun, when, obs, true, true);
    if (!targetEq || !sunEq || !Number.isFinite(targetEq.ra) || !Number.isFinite(targetEq.dec)) return null;
    var ra1 = targetEq.ra * Math.PI / 12, dec1 = targetEq.dec * Math.PI / 180;
    var ra2 = sunEq.ra * Math.PI / 12, dec2 = sunEq.dec * Math.PI / 180;
    var cosSep = Math.sin(dec1) * Math.sin(dec2) + Math.cos(dec1) * Math.cos(dec2) * Math.cos(ra1 - ra2);
    return Math.acos(Math.max(-1, Math.min(1, cosSep))) * 180 / Math.PI;
  } catch (err) { return null; }
}
function targetKind(target){
  if (typeof target === 'string') {
    if (target === 'Moon') return 'moon';
    if (target === 'Sun') return 'sun';
    if (PLANET_DATA[target]) return 'planet';
    return 'star';
  }
  if (target && target.kind) return target.kind;
  if (target && target.id) return 'deep';
  return 'star';
}
var DAY_MIN_SEP_MOON = 15, DAY_MIN_SEP_PLANET = 20, DAY_MAX_MAG_PLANET = -1.5;
function isObservableUnderSun(sunAlt, mag, target, obs, when){
  if (typeof sunAlt !== 'number' || !Number.isFinite(sunAlt)) return false;
  if (typeof mag !== 'number' || !Number.isFinite(mag)) return false;
  var kind = targetKind(target);
  // Deep sky: serve notte astronomica, indipendentemente dalla magnitudine integrata.
  if (kind === 'deep') return sunAlt <= -18;
  var separation = solarSeparationDegrees(target, obs, when);
  // Luna: si osserva anche di giorno, purché lontana dal Sole (sicurezza ottica).
  if (kind === 'moon') {
    if (sunAlt <= -0.833) return true;
    return separation !== null && separation >= DAY_MIN_SEP_MOON;
  }
  if (kind === 'planet') {
    var key = typeof target === 'string' ? target : (target && target.key ? target.key : null);
    if (sunAlt > -0.833) {
      // Pianeti molto luminosi (Venere, Giove) sono osservabili di giorno al telescopio, lontano dal Sole.
      return mag <= DAY_MAX_MAG_PLANET && separation !== null && separation >= DAY_MIN_SEP_PLANET;
    }
    if (separation === null && sunAlt > -12) return false;
    var minimumElongation = {Mercury:12, Venus:10, Mars:5, Jupiter:5, Saturn:5, Uranus:15, Neptune:15}[key] || 8;
    if (separation !== null && separation < minimumElongation) return false;
    return sunAlt <= sunAltThreshold(mag);
  }
  // Stelle: soglia per magnitudine, mai con Sole sopra l'orizzonte.
  if (sunAlt > -0.833) return false;
  return sunAlt <= sunAltThreshold(mag);
}
var DAY_SAFETY_NOTE = 'Osservazione diurna: non puntare mai il telescopio, il cercatore o la fotocamera verso il Sole. Verifica sempre la distanza dal Sole prima di guardare nell\'oculare.';

var activeRadarCleanup = null;
function compassDir(az){var i=Math.round(az/22.5)%16;if(i<0)i+=16;return COMPASS[i];}
function fmtTime(d){if(!d)return"--:--";return new Intl.DateTimeFormat('it-IT',{timeZone:OBS_TIMEZONE,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d);}
function hoursBetween(a,b){return (b.getTime()-a.getTime())/3600000;}
function addHours(d,h){return new Date(d.getTime()+h*3600000);}
function toast(msg,ms){
  var el=document.createElement('div');
  el.className='toast';el.textContent=msg;document.body.appendChild(el);
  setTimeout(function(){el.style.opacity='0';}, (ms||3000)-300);
  setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);}, (ms||3000));
}
function padLabel(label, width){var w=width||22;var s=String(label);while(s.length<w)s+=' ';return s;}
function fmtSystemUTC(d){var y=d.getUTCFullYear();var mo=String(d.getUTCMonth()+1).padStart(2,'0');var da=String(d.getUTCDate()).padStart(2,'0');var hh=String(d.getUTCHours()).padStart(2,'0');var mm=String(d.getUTCMinutes()).padStart(2,'0');var ss=String(d.getUTCSeconds()).padStart(2,'0');return da+'/'+mo+'/'+y+' '+hh+':'+mm+':'+ss+' UTC';}
function fmtLocalDateTime(d){if(!d)return"--/--/---- --:--:--";var p=new Intl.DateTimeFormat('en-CA',{timeZone:OBS_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(d),o={};p.forEach(function(x){if(x.type!=='literal')o[x.type]=x.value;});return o.day+'/'+o.month+'/'+o.year+' '+o.hour+':'+o.minute+':'+o.second;}
function magBrightnessClass(mag){if(mag<=-2)return"mag-super";if(mag<=0)return"mag-bright";if(mag<=2)return"mag-mid";if(mag<=4.5)return"mag-low";if(mag<=6)return"mag-dim";return"mag-faint";}
function magHTML(mag){return '<span class="mag-label">Mag</span> <span class="mag-value">'+Number(mag).toFixed(1)+'</span>';}
function magSpan(mag){return '<span class="pmag '+magBrightnessClass(mag)+'">'+magHTML(mag)+'</span>';}
function dateToIsoHourStr(d){var parts=new Intl.DateTimeFormat('en-CA',{timeZone:OBS_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(d);var o={};parts.forEach(function(p){if(p.type!=='literal')o[p.type]=p.value;});return o.year+'-'+o.month+'-'+o.day+'T'+o.hour+':00';}
function findHourlyIndex(times, dateObj){if(!times||!times.length||!dateObj)return -1;var key=dateToIsoHourStr(dateObj);for(var i=0;i<times.length;i++){if(times[i]===key)return i;}return -1;}
function daysFromToday(d){return obsDaysFromToday(d);}
function escapeHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
var METRIC_MIN_PX=11,METRIC_MAX_PX=20,_fitScheduled=false;
function lineOverflows(line){var v=line.querySelector('.metric-v');if(!v)return false;return v.scrollWidth>v.clientWidth+1;}
function fitOneLine(line){line.style.fontSize=METRIC_MAX_PX+'px';if(!lineOverflows(line)){line.dataset.fitPx=METRIC_MAX_PX;return;}var lo=METRIC_MIN_PX,hi=METRIC_MAX_PX,best=METRIC_MIN_PX,iter=0;while(hi-lo>0.4&&iter<12){iter++;var mid=(lo+hi)/2;line.style.fontSize=mid+'px';if(lineOverflows(line))hi=mid;else{lo=mid;best=mid;}}line.style.fontSize=best.toFixed(1)+'px';line.dataset.fitPx=best.toFixed(1);}
function fitMetrics(){var lines=document.querySelectorAll('.metric-line');if(!lines.length)return;for(var i=0;i<lines.length;i++){try{fitOneLine(lines[i]);}catch(e){}}}
function scheduleFitMetrics(){if(_fitScheduled)return;_fitScheduled=true;requestAnimationFrame(function(){requestAnimationFrame(function(){_fitScheduled=false;try{fitMetrics();}catch(e){}});});}
var _resizeTimer=null;
window.addEventListener('resize',function(){if(_resizeTimer)clearTimeout(_resizeTimer);_resizeTimer=setTimeout(scheduleFitMetrics,120);});
function formatDistanceLines(km, isFarDeepSky, fixedLy){
  if(isFarDeepSky && !(typeof fixedLy === 'number' && isFinite(fixedLy) && fixedLy > 0.05)){return {value:"n.d.", note:""};}
  if(isFarDeepSky || (typeof fixedLy === 'number' && fixedLy > 0.05)){
    var lyVal = fixedLy || (km/KM_PER_LY);var lyStr;
    if(lyVal >= 1e9)      lyStr = (lyVal/1e9).toFixed(2).replace('.',',') + " MILIARDI di Anni Luce";
    else if(lyVal >= 1e6) lyStr = (lyVal/1e6).toFixed(2).replace('.',',') + " Milioni di Anni Luce";
    else if(lyVal >= 1000)lyStr = Math.round(lyVal).toLocaleString('it-IT') + " Anni Luce";
    else                  lyStr = lyVal.toFixed(1).replace('.',',') + " Anni Luce";
    return {value: lyStr, note: ""};
  }
  var kmStr;
  if(km < 1e6)      kmStr = Math.round(km).toLocaleString('it-IT') + " km";
  else if(km < 1e9) kmStr = (km/1e6).toFixed(1).replace('.',',') + " Milioni di km";
  else {var mldVal = km/1e9;if(Math.abs(mldVal - 1.0) < 0.05) kmStr = "1 MILIARDO di km";else kmStr = mldVal.toFixed(2).replace('.',',') + " MILIARDI di km";}
  var minLight = (km/299792.458)/60;var lightStr;
  if(minLight < 1){var secLight = minLight * 60;lightStr = secLight.toFixed(1).replace('.',',') + " Secondi Luce";}
  else {lightStr = minLight.toFixed(1).replace('.',',') + " Minuti Luce";}
  return {value: kmStr, note: "(" + lightStr + ")"};
}
function formatMassLines(massStr){if(!massStr) return null;var m = massStr.match(/^(.+?)\s*\((.+)\)\s*$/);if(m) return {value: m[1].trim(), note: "(" + m[2].trim() + ")"};return {value: massStr, note: ""};}
function metricLineHTML(k, v, n){var noteHTML = n ? '<span class="metric-n">'+n+'</span>' : '';return '<div class="metric-line"><span class="metric-k">'+k+'</span><span class="metric-v">'+v+'</span>'+noteHTML+'</div>';}
function metricsBlockHTML(distObj, massObj){var html='<div class="metrics-block">'+metricLineHTML("Distanza:",distObj.value,distObj.note);if(massObj)html+=metricLineHTML("Massa:",massObj.value,massObj.note);return html+'</div>';}
function doubleByPln(name){ for (var i = 0; i < DOUBLE_STARS.length; i++) if (DOUBLE_STARS[i].pln === name) return DOUBLE_STARS[i]; return null; }
function doubleEyepiece(d){
  if (d.sepNum >= 15) return '25 mm (81x)';
  if (d.sepNum >= 5) return '15 mm (135x)';
  return 'Hyperion 12 mm (169x) o più, con seeing buono';
}
function doubleDesc(d){
  return {kind:'double', name:d.name, ra:d.ra, dec:d.dec, mag:d.mag, distLy:null, massRatio:null, url:d.url,
    simbad:'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=' + encodeURIComponent(d.simbadId),
    facts:'Stella doppia visuale. ' + d.comp + '. Separazione ' + d.sep + '.',
    guide:'Difficoltà: ' + d.diff + '. Oculare di partenza: ' + doubleEyepiece(d) + '. ' + d.note + ' Il limite di Dawes del C8 è circa 0,57″, il seeing reale è quasi sempre il fattore limitante.',
    dbl:d};
}
function doubleRowsHTML(d){
  return '<div class="datarow"><span>Componenti</span><b>' + escapeHtml(d.comp) + '</b></div>'
    + '<div class="datarow"><span>Separazione</span><b>' + escapeHtml(d.sep) + '</b></div>'
    + (d.pa ? '<div class="datarow"><span>Angolo di posizione</span><b>' + escapeHtml(d.pa) + '</b></div>' : '')
    + '<div class="datarow"><span>Difficoltà</span><b>' + escapeHtml(d.diff) + '</b></div>'
    + '<div class="datarow"><span>Oculare di partenza</span><b>' + escapeHtml(doubleEyepiece(d)) + '</b></div>'
    + '<div class="datarow"><span>Fonte</span><b style="font-weight:500">' + escapeHtml(DOUBLE_SOURCE) + '</b></div>';
}
