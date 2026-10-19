"use strict";
/* Astro Alberto. Scheda di dettaglio, puntamento AR e radar. I dati non disponibili sono indicati come N/D e le stime non sono presentate come certezze. */
function cleanupRadarIfActive(){if(typeof activeRadarCleanup === 'function'){try{ activeRadarCleanup(); }catch(e){} activeRadarCleanup = null;}}
function closeModal(){cleanupRadarIfActive();var mr=document.getElementById('modalRoot');if(mr)mr.innerHTML='';document.body.classList.remove('modal-open');}

function openCelestialModal(arg,atDate){
  cleanupRadarIfActive();
  var desc = resolveTarget(arg);
  var obs=new A.Observer(loc.lat,loc.lon,loc.elev);
  var now=atDate instanceof Date?atDate:new Date();
  var sunState = getSunState(obs, now);
  var title = desc.name;
  var facts, guide, radiusKm=null, massText=desc.massRatio||null, url=desc.url||null, simbad=desc.simbad||null;
  var mag=null, distObj, angDiamStr='--';var cons, horNow, eqNow;var isMoon = (desc.kind==='moon');
  if(desc.body){
    eqNow = A.Equator(desc.body, now, obs, true, true);
    horNow = A.Horizon(now, obs, eqNow.ra, eqNow.dec, 'normal');
    var eqJ2000 = A.Equator(desc.body, now, obs, false, true);
    cons = CON(eqJ2000.ra, eqJ2000.dec);
    var illum = A.Illumination(desc.body, now);mag = illum.mag;
    var kmDist = illum.geo_dist * KM_PER_AU;distObj = formatDistanceLines(kmDist, false);
    if(isMoon){facts = "Il satellite naturale della Terra.";guide = "Usa il telescopio lungo il terminatore.";radiusKm = 1737.4;var angDiamArcsecMoon = 206264.8*(2*radiusKm)/kmDist;angDiamStr = (angDiamArcsecMoon/60).toFixed(1) + "'";}
    else if(desc.kind==='sun'){facts="La stella al centro del Sistema Solare.";guide="Non guardare mai il Sole senza filtro certificato.";massText="333.000 volte la Terra (1 volta il Sole)";angDiamStr=((206264.8*2*695700/kmDist)/60).toFixed(1)+"'";}
    else{var pd = PLANET_DATA[desc.key];facts = pd.facts;guide = pd.guide;radiusKm = pd.radius;massText = pd.massRatio;url = pd.url;var angDiamArcsec = 206264.8*(2*radiusKm)/kmDist;angDiamStr = angDiamArcsec.toFixed(1) + '"';}
  } else {
    eqNow = fixedEquatorial(desc, now, obs);
    horNow = eqNow ? A.Horizon(now, obs, eqNow.ra, eqNow.dec, 'normal') : {azimuth:0, altitude:-90};
    cons = CON(desc.ra, desc.dec);mag = desc.mag;distObj = formatDistanceLines(0, true, desc.distLy);
    if(desc.kind === 'star'){facts = "Stella del catalogo.";guide = "Inizia col 25mm (81x) per centrare, poi passa a 135x se il seeing lo permette. Barlow + 25mm (163x) è una buona alternativa.";}
    else if(desc.kind === 'double'){facts = desc.facts;guide = desc.guide;}
    else{facts = "Oggetto del catalogo Messier.";guide = "Usa bassi ingrandimenti (25mm, 81x) per il campo, alza solo se il cielo è buio e trasparente.";}
  }
  if (desc.kind === 'deep' && !massText) massText = 'Dato non disponibile nel catalogo';
  var massObj = formatMassLines(massText);
  var isMultiComponentStar = desc.kind === 'star' && typeof massText === 'string' && massText.indexOf(';') >= 0;
  var stellarMassComponents = '';
  var singleStarMassRow = '';
  if(isMultiComponentStar){
    stellarMassComponents = massText.split(/\s*;\s*/).filter(Boolean).map(function(item){
      return '<div class="datarow mass-component-row"><b>'+escapeHtml(item.trim())+'</b></div>';
    }).join('');
  } else if(desc.kind === 'star' && massObj){
    singleStarMassRow = '<div class="datarow mass-component-row"><b>Massa: '+massObj.value+(massObj.note?' <span style="color:var(--muted-2);font-size:0.9em">'+massObj.note+'</span>':'')+'</b></div>';
  }
  var win = getNightWindow(obs, activeDate);
  var nightRef = new Date((win.start.getTime()+win.end.getTime())/2);

  var absCulm = null;
  if(desc.body){
    var bodyKey = isMoon ? 'Moon' : desc.key;
    absCulm = absoluteCulmination(bodyKey, obs, nightRef, win.start, win.end);
  } else {
    absCulm = absoluteCulmination(desc, obs, nightRef, win.start, win.end);
  }
  var nightPeak = null;
  if(desc.body){
    var bk = isMoon ? 'Moon' : desc.key;
    nightPeak = bestBody(A.Body[bk], obs, win.start, win.end);
  } else {
    nightPeak = bestFixed(desc, win.start, win.end, obs);
  }

  var posTxt;
  var observabilitySunOK = mag!==null && isObservableUnderSun(sunState.alt, mag, desc, obs, now);
  if(horNow.altitude <= 0)posTxt = 'In questo momento si trova <b>sotto l\'orizzonte</b> (azimut '+compassDir(horNow.azimuth)+' '+Math.round(horNow.azimuth)+'°).';
  else if(!observabilitySunOK)posTxt = 'Geometricamente è a <b>'+Math.round(horNow.altitude)+'°</b> sopra l\'orizzonte verso <b>'+compassDir(horNow.azimuth)+'</b>, ma il cielo è <b>troppo luminoso per questa magnitudine</b>.';
  else posTxt = 'In questo momento è a <b>'+compassDir(horNow.azimuth)+'</b> ('+Math.round(horNow.azimuth)+'°), a <b>'+Math.round(horNow.altitude)+'°</b> sopra l\'orizzonte ed è <b>osservabile</b>.';
  var moonImg="",moonCap="";
  if(isMoon){var phaseAngle=A.MoonPhase(now);var illumM = A.Illumination(A.Body.Moon, now);var fMoon=illumM.phase_fraction;moonImg='<div class="moon-phase-svg-wrap">'+moonPhaseSVG(fMoon,phaseAngle<180,170)+'</div>';moonCap='<div class="moon-phase-caption">Fase attuale · '+Math.round(fMoon*100)+'% illuminata</div>';}
  var distLine = distObj.value + (distObj.note ? ' <span style="color:var(--muted-2);font-size:0.9em">'+distObj.note+'</span>' : '');
  var massLine = massObj ? (massObj.value + (massObj.note ? ' <span style="color:var(--muted-2);font-size:0.9em">'+massObj.note+'</span>' : '')) : '';
  var simbadRow = simbad ? '<div class="datarow"><span>SIMBAD</span><b><a href="'+simbad+'" target="_blank" rel="noopener" style="color:var(--cyan)">Apri ↗</a></b></div>' : '';

  var culmHtml = '';
  if(absCulm){
    var q = observabilityQuality(absCulm.alt);
    var qClass = q.key;
    var outsideClass = absCulm.inNightWindow ? '' : ' outside';
    var outsideNote = absCulm.inNightWindow ? '' : '<div class="culm-note">La culminazione assoluta cade fuori dalla finestra notturna. Il picco realmente osservabile stanotte è alle '+fmtTime(nightPeak?nightPeak.time:absCulm.time)+'.</div>';
    culmHtml = '<div class="culm-block'+outsideClass+'">'
      + '<div class="culm-row"><span class="k">Picco stanotte:</span><span class="v">'+fmtTime(nightPeak?nightPeak.time:absCulm.time)+' a <b>'+Math.round(nightPeak?nightPeak.alt:absCulm.alt)+'°</b></span></div>'
      + '<div class="culm-row"><span class="k">Culmina a:</span><span class="v">'+fmtTime(absCulm.time)+' a <b>'+Math.round(absCulm.alt)+'°</b> <span class="culm-quality '+qClass+'">'+q.label+'</span></span></div>'
      + outsideNote
      + '</div>';
  } else {
    culmHtml = '<div class=\"culm-block outside\"><div class=\"culm-row\"><span class=\"k\">Culminazione:</span><span class=\"v\">N/D, dato non calcolabile</span></div></div>';
  }

  var massRowHtml = '';
  if(stellarMassComponents){ massRowHtml = stellarMassComponents; }
  else if(singleStarMassRow){ massRowHtml = singleStarMassRow; }
  else if(massObj){ massRowHtml = '<div class="datarow"><span>Massa (Terra / Sole)</span><b>'+massLine+'</b></div>'; }

  var html='<div class="modal-backdrop" id="modalBackdrop"><div class="modal-sheet">'
    +'<div class="mtop"><h3>'+escapeHtml(title)+'</h3><button type="button" class="mclose" id="modalClose">&times;</button></div>'
    +moonImg+moonCap
    +'<div class="mfacts">'+facts+'</div>'
    + ((desc.body && desc.key && PLANET_DATA[desc.key]) ? planetExtraHTML(desc.key, now) : '')
    + culmHtml
    +'<div class="beginner-guide" style="margin-bottom:12px;"><b>Consiglio osservativo:</b> '+guide+'</div>'
    +'<div class="compasswrap">'+compassSVG(horNow.azimuth,horNow.altitude,220)+'</div>'
    +'<div class="note">'+posTxt+'</div>'
    +((sunState.isDay && horNow.altitude>0 && desc.kind!=='sun')?sunSafetyHTML(solarSeparationDegrees(desc,obs,now),sunState):'')
    +'<div class="mstats">'
    +'<div class="datarow"><span>Costellazione</span><b>'+cons.name+'</b></div>'
    +'<div class="datarow"><span>Magnitudine</span>'+magSpan(mag)+'</div>'
    +'<div class="datarow"><span>Diametro apparente</span><b>'+angDiamStr+'</b></div>'
    +'<div class="datarow"><span>Distanza</span><b>'+distLine+'</b></div>'
    + (desc.kind==='double' && desc.dbl ? doubleRowsHTML(desc.dbl) : '')
    + massRowHtml
    +'<div class="datarow"><span>Culminazione</span><b>'+(absCulm?fmtTime(absCulm.time)+' a '+Math.round(absCulm.alt)+'°':'--:--')+'</b></div>'
    +'<div class="datarow"><span>Picco notturno</span><b>'+(nightPeak?fmtTime(nightPeak.time)+' a '+Math.round(nightPeak.alt)+'°':'--:--')+'</b></div>'
    +simbadRow
    +'</div>'
    +'<button type="button" class="arbtn" id="btnAR">📷 PUNTA CON LA FOTOCAMERA (AR)</button>'
    +'<button type="button" class="radarbtn" id="btnRadarFromModal">🧭 APRI RADAR</button>'
    +(url?'<div class="astrolinks" style="margin-top:12px"><a href="'+url+'" target="_blank" rel="noopener">Scheda completa ↗</a></div>':'')
    +'</div></div>';
  document.getElementById('modalRoot').innerHTML=html;
  document.body.classList.add('modal-open');
  document.getElementById('modalClose').addEventListener('click',closeModal);
  document.getElementById('modalBackdrop').addEventListener('click',function(e){if(e.target.id==='modalBackdrop')closeModal();});
  document.getElementById('btnAR').addEventListener('click',function(){startAR(desc);});
  document.getElementById('btnRadarFromModal').addEventListener('click',function(){openRadar(desc);});
}
function stopAR(){
  if (arState.stream) {
    arState.stream.getTracks().forEach(function(track){ try { track.stop(); } catch (err) {} });
    arState.stream = null;
  }
  if (arState.headingHandler) {
    window.removeEventListener('deviceorientationabsolute', arState.headingHandler, true);
    window.removeEventListener('deviceorientation', arState.headingHandler, true);
    arState.headingHandler = null;
  }
  if (arState.timer) { clearInterval(arState.timer); arState.timer = null; }
  var root = document.getElementById('arRoot');
  if (root) root.remove();
  if (document.querySelector('.tab-btn.active[data-tab="sky"]')) requestWakeLock();
  else releaseWakeLock();
}
function startAR(arg){
  var desc = resolveTarget(arg);
  var root = document.createElement('div');
  root.className = 'arview'; root.id = 'arRoot';
  root.innerHTML = '<button type="button" class="arclose" id="arClose" aria-label="Chiudi AR">&times;</button>'
    + '<button type="button" class="artoggle" id="arDebugToggle" aria-label="Mostra diagnostica">🐞</button>'
    + '<div class="ardebug hidden" id="arDebug"></div>'
    + '<button type="button" class="arcalib" id="arCalibBtn">🎯 Calibra sul bersaglio</button>'
    + '<button type="button" class="arcalibreset" id="arCalibResetBtn" aria-label="Azzera calibrazione">↺</button>'
    + '<div class="armsg" id="arMsg">Avvio sensori e fotocamera...</div>'
    + '<div class="search-circle" id="arSearch" style="display:none"></div>'
    + '<div class="ar-arrow" id="arArrow" style="display:none"></div>';
  document.body.appendChild(root);
  requestWakeLock();
  document.getElementById('arClose').addEventListener('click', stopAR);
  document.getElementById('arDebugToggle').addEventListener('click', function(){ var d=document.getElementById('arDebug'); if(d) d.classList.toggle('hidden'); });
  phonePitch = null; phoneHeading = null;
  phoneRawAlpha = null; phoneRawBeta = null; phoneRawGamma = null;
  var sensorPermissionDenied = false;
  orientationSeen = false; headingSource = null; orientationIssue = null;

  function clamp(value, min, max){ return Math.max(min, Math.min(max, value)); }
  function setMsg(message){ var el=document.getElementById('arMsg'); if(el){ el.style.display='block'; el.textContent=message; } }
  function onOrientation(e){
    processOrientationEvent(e);
    var debug = document.getElementById('arDebug');
    if (debug) debug.textContent = 'Sensori: ' + (orientationSeen ? 'ricezione dati' : 'in attesa')
      + '\nalpha: ' + (phoneRawAlpha === null ? 'N/D' : phoneRawAlpha.toFixed(1) + '°')
      + '\nbeta: ' + (phoneRawBeta === null ? 'N/D' : phoneRawBeta.toFixed(1) + '°')
      + '\nheading geografico: ' + (phoneHeading === null ? 'N/D' : phoneHeading.toFixed(1) + '°')
      + '\ninclinazione: ' + (phonePitch === null ? 'N/D' : phonePitch.toFixed(1) + '°')
      + '\ndeclinazione WMM: ' + (OBS_MAG_DECL === null ? 'N/D' : OBS_MAG_DECL.toFixed(2) + '°')
      + '\nnord sensore: ' + (headingSource === 'absolute-true' ? 'geografico (Info)' : headingSource === 'magnetic-corrected' ? 'magnetico + WMM' : 'N/D');
  }

  document.getElementById('arCalibBtn').addEventListener('click', function(){
    if (phoneHeading === null || phonePitch === null || (headingSource === 'magnetic-corrected' && OBS_MAG_DECL === null)) {
      toast('Calibrazione non disponibile: servono bussola e orientamento 3D affidabili. La bussola magnetica richiede WMM.', 3200);
      return;
    }
    var observer = new A.Observer(loc.lat, loc.lon, loc.elev), now = new Date(), horizon;
    if (desc.body) {
      var eq = A.Equator(desc.body, now, observer, true, true);
      horizon = A.Horizon(now, observer, eq.ra, eq.dec, 'normal');
    } else horizon = fixedHorizon(desc, now, observer);
    if (!horizon || !Number.isFinite(horizon.azimuth) || !Number.isFinite(horizon.altitude)) {
      toast('Coordinate del bersaglio non disponibili.', 2500); return;
    }
    arCalibAz = ((horizon.azimuth - phoneHeading + 540) % 360) - 180;
    arCalibAlt = horizon.altitude - phonePitch;
    safeSet('astroalert_ar_calib_az', arCalibAz.toFixed(3));
    safeSet('astroalert_ar_calib_alt', arCalibAlt.toFixed(3));
    toast('Calibrazione registrata. Ripeti se il telefono si è spostato.', 2800);
  });
  document.getElementById('arCalibResetBtn').addEventListener('click', function(){
    arCalibAz = 0; arCalibAlt = 0;
    safeSet('astroalert_ar_calib_az', '0'); safeSet('astroalert_ar_calib_alt', '0');
    toast('Calibrazione azzerata.', 2000);
  });

  function requestOrientationPermission(){
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      return DeviceOrientationEvent.requestPermission().then(function(result){
        if (result !== 'granted') { sensorPermissionDenied = true; return false; }
        return true;
      }).catch(function(){ sensorPermissionDenied = true; return false; });
    }
    return Promise.resolve(true);
  }
  function startSensorsAndCamera(){
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMsg('Fotocamera non disponibile in questo browser. Usa il Radar manuale.'); return;
    }
    setMsg('Richiesta autorizzazione fotocamera...');
    navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}, audio:false})
      .then(function(stream){
        arState.stream = stream;
        var video = document.createElement('video');
        video.setAttribute('playsinline', ''); video.autoplay = true; video.muted = true; video.srcObject = stream;
        root.insertBefore(video, root.firstChild);
        video.play().catch(function(){ setMsg('Fotocamera attiva. Tocca il video se non parte.'); });
        var label = document.createElement('div'); label.className = 'arlabel'; root.appendChild(label);
        var searchEl = document.getElementById('arSearch'), arrowEl = document.getElementById('arArrow');
        if (searchEl) searchEl.style.display = 'block';
        arState.headingHandler = onOrientation;
        if (!sensorPermissionDenied) {
          window.addEventListener('deviceorientationabsolute', onOrientation, true);
          window.addEventListener('deviceorientation', onOrientation, true);
        }
        var ticks = 0, lockTolerance = 5;
        // Il campo visivo è una stima: varia tra telefoni e fotocamere.
        var verticalFov = 55;
        function refreshFov(){
          var videoRatio = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : root.clientWidth / Math.max(1, root.clientHeight);
          var horizontalFov = 2 * Math.atan(Math.tan(verticalFov * Math.PI / 360) * videoRatio) * 180 / Math.PI;
          return {horizontal:horizontalFov, vertical:verticalFov};
        }
        arState.timer = setInterval(function(){
          ticks++;
          var observer = new A.Observer(loc.lat, loc.lon, loc.elev), now = new Date(), horizon;
          if (desc.body) {
            var eq = A.Equator(desc.body, now, observer, true, true);
            horizon = A.Horizon(now, observer, eq.ra, eq.dec, 'normal');
          } else horizon = fixedHorizon(desc, now, observer);
          if (phoneHeading === null || phonePitch === null || (headingSource === 'magnetic-corrected' && OBS_MAG_DECL === null)) {
            if (searchEl) { searchEl.style.display = 'none'; searchEl.classList.remove('locked'); }
            if (arrowEl) arrowEl.style.display = 'none';
            label.textContent = '';
            if (ticks === 2 || ticks % 10 === 0) {
              if (sensorPermissionDenied) setMsg('Permesso sensori negato. La fotocamera resta attiva, ma per il puntamento usa il Radar manuale.');
              else if (phoneHeading === null && OBS_MAG_DECL === null) setMsg('Bussola o declinazione WMM non disponibili. Usa il Radar manuale.');
              else setMsg('In attesa di bussola e inclinometro. Muovi il telefono lentamente.');
            }
            return;
          }
          if (!horizon || !Number.isFinite(horizon.azimuth) || !Number.isFinite(horizon.altitude)) {
            setMsg('Posizione del bersaglio non disponibile.'); return;
          }
          var msg = document.getElementById('arMsg');
          if (horizon.altitude < 0) {
            setMsg(desc.name + ' è sotto l’orizzonte.');
            if (searchEl) { searchEl.style.display='none'; searchEl.classList.remove('locked'); }
            if (arrowEl) arrowEl.style.display='none'; label.textContent=''; return;
          }
          var effectiveHeading = wrap360(phoneHeading + arCalibAz);
          var effectivePitch = clamp(phonePitch + arCalibAlt, -90, 90);
          var diffAz = ((horizon.azimuth - effectiveHeading + 540) % 360) - 180;
          var diffAlt = horizon.altitude - effectivePitch;
          var fov = refreshFov();
          var cosAlt = Math.max(0.05, Math.cos(horizon.altitude * Math.PI / 180));
          var diffAzScaled = diffAz * cosAlt;
          var totalError = Math.sqrt(diffAzScaled * diffAzScaled + diffAlt * diffAlt);
          var aligned = totalError <= lockTolerance;
          var x = 50 + (diffAzScaled / (fov.horizontal / 2)) * 45;
          var y = 50 - (diffAlt / (fov.vertical / 2)) * 45;
          if (searchEl) {
            searchEl.style.display = 'block';
            searchEl.style.left = clamp(x, 12, 88) + '%';
            searchEl.style.top = clamp(y, 14, 86) + '%';
            searchEl.classList.toggle('locked', aligned);
          }
          if (msg) msg.style.display = 'none';
          if (aligned) {
            if (arrowEl) arrowEl.style.display = 'none';
            label.textContent = desc.name + ' · alt ' + Math.round(horizon.altitude) + '° · allineamento indicativo';
          } else {
            var hints = [];
            if (Math.abs(diffAz) >= fov.horizontal / 2) hints.push(diffAz > 0 ? 'Ruota a destra →' : '← Ruota a sinistra');
            else if (Math.abs(diffAz) >= lockTolerance) hints.push(diffAz > 0 ? '→ destra' : '← sinistra');
            if (Math.abs(diffAlt) >= fov.vertical / 2) hints.push(diffAlt > 0 ? '↑ Alza' : '↓ Abbassa');
            else if (Math.abs(diffAlt) >= lockTolerance) hints.push(diffAlt > 0 ? '↑ alza' : '↓ abbassa');
            if (arrowEl) { arrowEl.style.display = hints.length ? 'block' : 'none'; arrowEl.textContent = hints.join('   '); }
            label.textContent = '';
          }
        }, 300);
      })
      .catch(function(){ setMsg('Fotocamera negata o non disponibile. Controlla i permessi del sito e usa il Radar manuale.'); });
  }
  requestOrientationPermission().then(function(granted){
    if (!granted) sensorPermissionDenied = true;
    startSensorsAndCamera();
  });
}

function radarSVG(size, targets, phoneHeading, highlightName){
  var cx = size/2, cy = size/2, R = size/2 - 30;
  var svg = '<svg viewBox="0 0 '+size+' '+size+'" width="'+size+'" height="'+size+'">';
  svg += '<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="rgba(15,24,40,0.75)" stroke="var(--line)" stroke-width="1.5"/>';
  [{alt:0},{alt:30},{alt:60}].forEach(function(r){
    var rr = R*(1 - r.alt/90);
    svg += '<circle cx="'+cx+'" cy="'+cy+'" r="'+rr.toFixed(1)+'" fill="none" stroke="var(--line)" stroke-width="0.7" stroke-dasharray="3,3" opacity="0.55"/>';
    svg += '<text x="'+(cx+4).toFixed(1)+'" y="'+(cy-rr+11).toFixed(1)+'" font-family="ui-monospace,monospace" font-size="9" fill="var(--muted-2)">'+r.alt+'°</text>';
  });
  [['N',0],['E',90],['S',180],['O',270]].forEach(function(c){
    var ang = c[1]*Math.PI/180;
    svg += '<line x1="'+(cx-(R-4)*Math.sin(ang)).toFixed(1)+'" y1="'+(cy-(R-4)*Math.cos(ang)).toFixed(1)+'" x2="'+(cx-R*Math.sin(ang)).toFixed(1)+'" y2="'+(cy-R*Math.cos(ang)).toFixed(1)+'" stroke="var(--muted)" stroke-width="1.5"/>';
    svg += '<text x="'+(cx-(R+16)*Math.sin(ang)).toFixed(1)+'" y="'+(cy-(R+16)*Math.cos(ang)+5).toFixed(1)+'" text-anchor="middle" font-family="ui-monospace,monospace" font-size="14" font-weight="700" fill="var(--amber)">'+c[0]+'</text>';
  });
  var hlTarget = null;
  if(highlightName){
    for(var hi=0; hi<targets.length; hi++){
      if(targets[hi].name === highlightName){ hlTarget = targets[hi]; break; }
    }
  }
  if(hlTarget && hlTarget.alt > 0){
    var rrT = R * (1 - Math.min(90, hlTarget.alt)/90);
    var angT = hlTarget.az * Math.PI / 180;
    var pxT = cx - rrT * Math.sin(angT);
    var pyT = cy - rrT * Math.cos(angT);
    svg += '<line x1="'+cx+'" y1="'+cy+'" x2="'+pxT.toFixed(1)+'" y2="'+pyT.toFixed(1)+'" stroke="var(--amber)" stroke-width="8" stroke-linecap="round" opacity="0.15"/>';
    svg += '<line x1="'+cx+'" y1="'+cy+'" x2="'+pxT.toFixed(1)+'" y2="'+pyT.toFixed(1)+'" stroke="var(--amber)" stroke-width="2.5" stroke-linecap="round" opacity="0.95"><animate attributeName="opacity" values="0.55;1;0.55" dur="1.6s" repeatCount="indefinite"/></line>';
    svg += '<circle cx="'+pxT.toFixed(1)+'" cy="'+pyT.toFixed(1)+'" r="15" fill="none" stroke="var(--amber)" stroke-width="1.6" opacity="0.85"/>';
  }
  if(phoneHeading !== null && phoneHeading !== undefined && isFinite(phoneHeading)){
    var hAng = phoneHeading * Math.PI / 180;
    var hx = cx - (R-2) * Math.sin(hAng);
    var hy = cy - (R-2) * Math.cos(hAng);
    svg += '<line x1="'+cx+'" y1="'+cy+'" x2="'+hx.toFixed(1)+'" y2="'+hy.toFixed(1)+'" stroke="rgba(255,255,255,0.45)" stroke-width="1.2" stroke-dasharray="4,5"/>';
    svg += '<circle cx="'+hx.toFixed(1)+'" cy="'+hy.toFixed(1)+'" r="6" fill="rgba(255,255,255,0.7)" stroke="#fff" stroke-width="1.5"/>';
  }
  var radarBoxes = [];
  [0,30,60].forEach(function(al){ var rr0 = R*(1-al/90); radarBoxes.push({x1:cx+3, y1:cy-rr0+1, x2:cx+4+String(al).length*5.4+8, y2:cy-rr0+13}); });
  [0,90,180,270].forEach(function(dg){ var an0 = dg*Math.PI/180; var ex0 = cx-(R+16)*Math.sin(an0), ey0 = cy-(R+16)*Math.cos(an0)+5; radarBoxes.push({x1:ex0-9, y1:ey0-14, x2:ex0+9, y2:ey0+4}); });
  radarBoxes.push({x1:cx-12, y1:cy-12, x2:cx+12, y2:cy+12});
  function radarOverlap(a, b){ return !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2); }
  var radarDots = [];
  targets.forEach(function(t){
    if(t.alt <= 0) return;
    var rr0 = R * (1 - Math.min(90, t.alt)/90), a0 = t.az * Math.PI / 180;
    radarDots.push({x:cx - rr0 * Math.sin(a0), y:cy - rr0 * Math.cos(a0)});
  });
  function radarLabelPos(px, py, r, text){
    var tw = text.length * 5.6 + 4, th = 11;
    var cands = [[0, -r - 6], [0, r + 12], [r + 4 + tw/2, 3], [-(r + 4 + tw/2), 3], [0, -r - 18], [0, r + 24], [r + 4 + tw/2, -10], [-(r + 4 + tw/2), -10], [r + 4 + tw/2, 14], [-(r + 4 + tw/2), 14]];
    for(var ci = 0; ci < cands.length; ci++){
      var lx = px + cands[ci][0], ly = py + cands[ci][1];
      var box = {x1:lx - tw/2, y1:ly - th + 2, x2:lx + tw/2, y2:ly + 3};
      if(box.x1 < 2 || box.x2 > size - 2 || box.y1 < 2 || box.y2 > size - 2) continue;
      var bad = false;
      for(var bi = 0; bi < radarBoxes.length && !bad; bi++) if(radarOverlap(box, radarBoxes[bi])) bad = true;
      for(var di = 0; di < radarDots.length && !bad; di++){
        var dd = radarDots[di];
        if(Math.abs(dd.x - px) < 0.5 && Math.abs(dd.y - py) < 0.5) continue;
        if(radarOverlap(box, {x1:dd.x - 6, y1:dd.y - 6, x2:dd.x + 6, y2:dd.y + 6})) bad = true;
      }
      if(bad) continue;
      radarBoxes.push(box);
      return {x:lx, y:ly};
    }
    return null;
  }
  var radarOrder = targets.map(function(t, i){ return i; }).sort(function(a, b){
    function pr(t){ return t.kind==='moon'?0:t.kind==='sun'?1:t.kind==='planet'?2:3; }
    return pr(targets[a]) - pr(targets[b]);
  });
  var radarLabels = {};
  radarOrder.forEach(function(idx){
    var t = targets[idx];
    if(t.alt <= 0) return;
    var isHi0 = highlightName && t.name === highlightName;
    if(!(t.kind==='moon' || t.kind==='sun' || t.kind==='planet' || isHi0)) return;
    var rr1 = R * (1 - Math.min(90, t.alt)/90), a1 = t.az * Math.PI / 180;
    var px1 = cx - rr1 * Math.sin(a1), py1 = cy - rr1 * Math.cos(a1);
    var r1 = t.kind==='moon'?7:(t.mag!==null&&t.mag<=1?6:5);
    if(t.kind==='planet') r1 = r1 * PLANET_SIZE_BOOST;
    radarLabels[idx] = radarLabelPos(px1, py1, r1, t.name);
  });
  targets.forEach(function(t, idx){
    if(t.alt <= 0) return;
    var rr = R * (1 - Math.min(90, t.alt)/90);
    var ang = t.az * Math.PI / 180;
    var px = cx - rr * Math.sin(ang);
    var py = cy - rr * Math.cos(ang);
    var color = t.kind==='planet'?'var(--amber)':t.kind==='moon'?'#ffffff':t.kind==='sun'?'#ffd84d':t.kind==='star'?'#aabfff':t.kind==='double'?'#e08cff':'var(--green)';
    var r = t.kind==='moon'?7:(t.mag!==null&&t.mag<=1?6:5);
    if(t.kind==='planet') r = r * PLANET_SIZE_BOOST;
    var isHi = highlightName && t.name===highlightName;
    svg += '<g class="radar-dot" data-idx="'+idx+'" style="cursor:pointer">';
    svg += '<circle cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="'+(r+10)+'" fill="transparent"/>';
    if(isHi){
      svg += '<circle cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="'+(r+4)+'" fill="none" stroke="'+color+'" stroke-width="2" opacity="0.9"><animate attributeName="r" values="'+(r+3)+';'+(r+11)+';'+(r+3)+'" dur="1.6s" repeatCount="indefinite"/></circle>';
    }
    svg += '<circle cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="'+r+'" fill="'+color+'" stroke="#070c16" stroke-width="1.5"/>';
    if(radarLabels[idx]){
      svg += '<text x="'+radarLabels[idx].x.toFixed(1)+'" y="'+radarLabels[idx].y.toFixed(1)+'" text-anchor="middle" font-family="ui-monospace,monospace" font-size="9" font-weight="700" fill="#fff" stroke="#070c16" stroke-width="2" paint-order="stroke">'+escapeHtml(t.name)+'</text>';
    }
    svg += '</g>';
  });
  svg += '<circle cx="'+cx+'" cy="'+cy+'" r="11" fill="none" stroke="var(--cyan)" stroke-width="1.4" opacity="0.7"/>';
  svg += '<circle cx="'+cx+'" cy="'+cy+'" r="5.5" fill="#fff" stroke="var(--cyan)" stroke-width="2"/>';
  svg += '</svg>';
  return svg;
}
function openRadar(highlightDesc){
  cleanupRadarIfActive();
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().catch(function(){});
    }
  } catch (err) { /* permesso sensori non disponibile */ }
  orientationSeen = false;
  var obs = new A.Observer(loc.lat, loc.lon, loc.elev);var now = new Date();var targets = [];
  try{var moonEq = A.Equator(A.Body.Moon, now, obs, true, true);var moonHor = A.Horizon(now, obs, moonEq.ra, moonEq.dec, 'normal');var moonIllum = A.Illumination(A.Body.Moon, now);targets.push({kind:'moon', name:'Luna', az:moonHor.azimuth, alt:moonHor.altitude, mag:moonIllum.mag, desc:resolveTarget('Moon')});}catch(e){}
  Object.keys(PLANET_DATA).forEach(function(k){try{var eq = A.Equator(A.Body[k], now, obs, true, true);var hor = A.Horizon(now, obs, eq.ra, eq.dec, 'normal');var illum = A.Illumination(A.Body[k], now);targets.push({kind:'planet', name:PLANET_DATA[k].name, az:hor.azimuth, alt:hor.altitude, mag:illum.mag, desc:resolveTarget(k)});}catch(e){}});
  STAR_CATALOG.forEach(function(s){try{var hor = fixedHorizon(s, now, obs);targets.push({kind:'star', name:s.name, az:hor.azimuth, alt:hor.altitude, mag:s.mag, desc:{kind:'star', name:s.name, ra:s.ra, dec:s.dec, mag:s.mag, distLy:s.distLy, massRatio:s.massRatio, url:s.url, simbad:s.simbad}});}catch(e){}});
  DOUBLE_STARS.forEach(function(d){if(d.radar===false)return;try{var hor = fixedHorizon(d, now, obs);targets.push({kind:'double', name:d.name, az:hor.azimuth, alt:hor.altitude, mag:d.mag, desc:doubleDesc(d)});}catch(e){}});
  MESSIER.forEach(function(m){try{var hor = fixedHorizon(m, now, obs);var simbadUrl='https://simbad.cds.unistra.fr/simbad/sim-id?Ident='+encodeURIComponent(m.id);targets.push({kind:'deep', name:m.name, az:hor.azimuth, alt:hor.altitude, mag:m.mag, desc:{kind:'deep', name:m.name, ra:m.ra, dec:m.dec, mag:m.mag, distLy:m.distLy, url:m.url, simbad:simbadUrl}});}catch(e){}});
  var highlightName = highlightDesc ? highlightDesc.name : null;
  var html = '<div class="modal-backdrop" id="radarBackdrop"><div class="modal-sheet radar-sheet">'
    + '<div class="mtop"><h3>🧭 Radar del cielo</h3><button type="button" class="mclose" id="radarClose">&times;</button></div>'
    + '<div class="section-note" style="margin-top:0">Centro = <b>zenit</b> (90°). Bordo = <b>orizzonte</b> (0°). Vista verso l\'alto: <b>Est a sinistra</b>, come nel planisfero.</div>'
    + '<div class="radar-wrap" id="radarWrap"></div>'
    + '<div class="radar-legend">'
    +   '<span><i style="background:#fff;box-shadow:0 0 0 2px var(--cyan)"></i>Tu (zenit)</span>'
    +   '<span><i style="background:#fff"></i>Luna</span>'
    +   '<span><i style="background:var(--amber)"></i>Pianeti</span>'
    +   '<span><i style="background:#aabfff"></i>Stelle</span>'
    +   '<span><i style="background:#e08cff"></i>Doppie</span>'
    +   '<span><i style="background:var(--green)"></i>Deep sky</span>'
    + '</div>'
    + '<div class="radar-hint" id="radarCount"></div>'
    + '<div class="radar-hint" id="radarCompassNote"></div>'
    + '</div></div>';
  document.getElementById('modalRoot').innerHTML = html;
  document.body.classList.add('modal-open');
  function radarOrientation(e){ processOrientationEvent(e); }
  window.addEventListener('deviceorientationabsolute', radarOrientation, true);window.addEventListener('deviceorientation', radarOrientation, true);
  function render(){
    var w = document.getElementById('radarWrap');if(!w) return;
    var size = Math.min(window.innerWidth - 24, 440);
    var heading = (phoneHeading !== null) ? ((phoneHeading + arCalibAz) % 360 + 360) % 360 : null;
    w.innerHTML = radarSVG(size, targets, heading, highlightName);
    var visCount = targets.filter(function(t){return t.alt>0;}).length;
    var cnEl = document.getElementById('radarCompassNote');if(cnEl) cnEl.textContent = compassStatusText();var countEl = document.getElementById('radarCount');if(countEl) countEl.textContent = visCount + ' bersagli sopra l\'orizzonte · ' + targets.length + ' totali';
    w.querySelectorAll('.radar-dot').forEach(function(el){el.addEventListener('click', function(){var idx = parseInt(el.dataset.idx,10);var t = targets[idx];if(t && t.desc){closeRadar();openCelestialModal(t.desc);}});});
  }
  var timer = null;
  function closeRadar(){
    if(timer) clearInterval(timer);
    window.removeEventListener('deviceorientationabsolute', radarOrientation, true);window.removeEventListener('deviceorientation', radarOrientation, true);
    var mr = document.getElementById('modalRoot');if(mr) mr.innerHTML='';
    document.body.classList.remove('modal-open');
    activeRadarCleanup = null;
  }
  activeRadarCleanup = closeRadar;
  render();
  timer = setInterval(render, 700);
  document.getElementById('radarClose').addEventListener('click', closeRadar);
  document.getElementById('radarBackdrop').addEventListener('click', function(e){if(e.target.id === 'radarBackdrop') closeRadar();});
}
