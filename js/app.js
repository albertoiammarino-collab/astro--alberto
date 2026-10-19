"use strict";
/* Astro Alberto. Posizione, onboarding, avvio dell'applicazione. I dati non disponibili sono indicati come N/D e le stime non sono presentate come certezze. */
function updateLocLabel(){
  var el = document.getElementById('locLabel');
  if (!el) return;
  var latHemisphere = loc.lat < 0 ? 'S' : 'N';
  var lonHemisphere = loc.lon < 0 ? 'O' : 'E';
  el.innerHTML = '<span class="online-dot" id="onlineDot"></span>'
    + Math.abs(loc.lat).toFixed(4) + '° ' + latHemisphere + ', '
    + Math.abs(loc.lon).toFixed(4) + '° ' + lonHemisphere + ' · ' + escapeHtml(loc.name);
  updateOnlineDot();
}

function geocodeCity(query){
  var resEl=document.getElementById('locResults');
  resEl.innerHTML='<div class="loc-item">Ricerca coordinate in corso...</div>';
  var myToken=++geocodeFetchToken;
  var url="https://geocoding-api.open-meteo.com/v1/search?name="+encodeURIComponent(query)+"&count=4&language=it&format=json";
  fetchJSONTimeout(url,10000).then(function(data){
    if(myToken!==geocodeFetchToken)return;
    if(!data.results||!data.results.length){resEl.innerHTML='<div class="loc-item">Nessuna località trovata.</div>';return;}
    resEl.innerHTML=data.results.map(function(item,idx){
      var sub=[item.admin1,item.country].filter(Boolean).join(", ");
      return '<div class="loc-item" data-idx="'+idx+'"><b>'+escapeHtml(item.name)+'</b> <span>('+escapeHtml(sub)+')</span></div>';
    }).join("");
    data.results.forEach(function(item,idx){
      var el=resEl.querySelector('[data-idx="'+idx+'"]');
      if(el)el.addEventListener('click',function(){
        loc.lat=item.latitude;loc.lon=item.longitude;
        var hasElev=(typeof item.elevation==='number' && isFinite(item.elevation));
        loc.elev=hasElev?item.elevation:0;
        loc.elevSource=hasElev?'geocode':'pending';
        loc.name=item.name+(item.admin1?" ("+item.admin1+")":"");
        if(item.timezone)OBS_TIMEZONE=item.timezone;
        activeDate=obsNowActiveDate();
        saveLocation();
        updateMagDecl();
        updateLocLabel();
        resEl.innerHTML="";document.getElementById('locInput').value="";
        weatherLoaded=false;
        updateAstro();
        ensurePlanisphereClock(true);drawPlanisphere();
        fetchWeather();
      });
    });
  }).catch(function(){if(myToken!==geocodeFetchToken)return;resEl.innerHTML='<div class="loc-item">Errore di connessione o tempo scaduto. Riprova.</div>';});
}
function acquireGps(){
  if (!navigator.geolocation) { toast('Il browser non supporta la geolocalizzazione. Inserisci la città manualmente.', 3500); return; }
  var btn = document.getElementById('btnGps');
  var previous = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = '<span class="hdr-btn-icon">⏳</span><span>GPS</span>';
  navigator.geolocation.getCurrentPosition(function(pos){
    loc.lat = pos.coords.latitude;
    loc.lon = pos.coords.longitude;
    var gpsAltOk = Number.isFinite(pos.coords.altitude) && Number.isFinite(pos.coords.altitudeAccuracy) && pos.coords.altitudeAccuracy <= 50;
    loc.elev = gpsAltOk ? pos.coords.altitude : 0;
    loc.elevSource = gpsAltOk ? 'gps' : 'pending';
    loc.name = 'Posizione GPS';
    var dz = deviceTimeZone();
    if (dz) OBS_TIMEZONE = dz;
    activeDate = obsNowActiveDate();
    saveLocation();
    updateLocLabel();
    updateMagDecl();
    if (btn) btn.innerHTML = previous;
    weatherLoaded = false;
    updateAstro(); ensurePlanisphereClock(true); drawPlanisphere(); fetchWeather();
    toast('Posizione aggiornata.', 1800);
  }, function(error){
    if (btn) btn.innerHTML = previous;
    var message = 'Posizione non disponibile.';
    if (error && error.code === 1) message = 'Permesso GPS negato. Attivalo nelle impostazioni del browser oppure inserisci la città.';
    else if (error && error.code === 2) message = 'Il dispositivo non riesce a determinare la posizione.';
    else if (error && error.code === 3) message = 'Ricerca GPS scaduta. Riprova all’aperto.';
    toast(message, 4500);
  }, {timeout:10000, enableHighAccuracy:true, maximumAge:60000});
}

var onboardingSeenSession = false;
function shouldShowOnboarding(){
  if (onboardingSeenSession) return false;
  return safeGet('astroalert_onboarded') !== '1';
}
function runOnboarding(){
  if (!shouldShowOnboarding()) return false;
  var overlay = document.getElementById('permOverlay');
  if (!overlay) return false;
  overlay.style.display = 'flex';
  var grant = document.getElementById('permGrant');
  if (grant) grant.addEventListener('click', function(){
    onboardingSeenSession = true;
    safeSet('astroalert_onboarded', '1');
    overlay.style.display = 'none';
    startAppData();
  }, {once:true});
  return true;
}
function startAppData(){
  weatherLoaded = false;
  updateAstro();
  ensurePlanisphereClock(true);
  drawPlanisphere();
  fetchWeather();
  fetchKp();
  updateMagDecl();
}

window.resetAstroAlertOnboarding=function(){
  try{localStorage.removeItem('astroalert_onboarded');}catch(e){}
  toast('Introduzione ripristinata. Ricarico...',1500);
  setTimeout(function(){location.reload();},800);
};
function updateOnlineDot(){
  var el=document.getElementById('onlineDot');if(!el)return;
  el.classList.toggle('off',!navigator.onLine);
  el.title=navigator.onLine?'Online':'Offline';
}
window.addEventListener('online',updateOnlineDot);
window.addEventListener('offline',updateOnlineDot);
var wakeLock=null;
function requestWakeLock(){
  if (!('wakeLock' in navigator) || wakeLock) return;
  if (document.hidden) return;
  try {
    navigator.wakeLock.request('screen').then(function(lock){
      wakeLock = lock;
      lock.addEventListener('release', function(){ if (wakeLock === lock) wakeLock = null; });
    }).catch(function(){ /* supporto non disponibile: l'app continua a funzionare */ });
  } catch (err) { /* Wake Lock è facoltativo */ }
}
function releaseWakeLock(){
  if (!wakeLock) return;
  var lock = wakeLock;
  wakeLock = null;
  try { lock.release(); } catch (err) { /* il lock può essere già stato rilasciato */ }
}
document.addEventListener('visibilitychange', function(){
  if (document.hidden) releaseWakeLock();
  else if (document.getElementById('arRoot') || document.querySelector('.tab-btn.active[data-tab="sky"]')) requestWakeLock();
});

function checkSecureContext(){
  if(window.isSecureContext)return true;
  var banner=document.createElement('div');banner.className='secure-warn';
  banner.innerHTML='<b>Contesto non sicuro</b> ('+location.protocol+'//'+location.hostname+').<br>GPS, fotocamera e sensori richiedono un contesto sicuro.<br>Apri l’app da <b>HTTPS</b>.';
  document.body.insertBefore(banner,document.body.firstChild);
  return false;
}
function showCdnError(){
  var t=document.getElementById('dateTitle');if(t)t.textContent="Motore astronomico non disponibile";
  var p=document.getElementById('planetCards');
  if(p)p.innerHTML='<div class="note err"><b>Errore critico:</b> la libreria Astronomy Engine non è stata caricata.</div>';
  var n=document.getElementById('nightTargets');if(n)n.innerHTML='<div class="section-note">In attesa del motore astronomico...</div>';
}
function init(){
  try{if(screen.orientation&&screen.orientation.lock)screen.orientation.lock('portrait').catch(function(){});}catch(e){}
  if('serviceWorker' in navigator && window.isSecureContext){navigator.serviceWorker.register('sw.js').catch(function(){});}
  var deferredInstall=null,bi=document.getElementById('btnInstall');
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredInstall=e;if(bi)bi.style.display='inline-flex';});
  window.addEventListener('appinstalled',function(){if(bi)bi.style.display='none';deferredInstall=null;});
  if(bi)bi.addEventListener('click',function(){if(!deferredInstall)return;deferredInstall.prompt();deferredInstall.userChoice.then(function(){deferredInstall=null;bi.style.display='none';});});

  document.querySelectorAll('.tab-btn').forEach(function(btn){
    btn.addEventListener('click', function(){ switchTab(btn.dataset.tab); });
  });
  document.querySelectorAll('#solarSeg button').forEach(function(btn){
    btn.addEventListener('click', function(){ switchSolarSeg(btn.dataset.seg); });
  });

  checkSecureContext();
  renderEyepieceTable();bindAfovInputs();initBortleSelect();
  updateLocLabel();updateOnlineDot();
  try {initMoonTabs();renderLandingSites();renderCratersAndMaria();} catch(err){ console.error('[Moon init]', err); }
  try { initPlanisphere(); } catch(err) { console.error('[Planisphere init]', err); }
  if(typeof Astronomy==='undefined'){
    showCdnError();
    setTimeout(function(){if(typeof Astronomy!=='undefined')location.reload();else showCdnError();},4000);
    return;
  }
  var onboardingShown = runOnboarding();
  if (!onboardingShown) { updateAstro(); ensurePlanisphereClock(true); drawPlanisphere(); fetchWeather(); fetchKp(); updateMagDecl(); }
  document.getElementById('btnGps').addEventListener('click',acquireGps);
  document.getElementById('btnSearchCity').addEventListener('click',function(){var q=document.getElementById('locInput').value.trim();if(q.length>1)geocodeCity(q);});
  document.getElementById('locInput').addEventListener('keydown',function(e){if(e.key==='Enter'){var q=this.value.trim();if(q.length>1)geocodeCity(q);}});
  document.querySelectorAll('#filterToolbar button').forEach(function(btn){
    btn.addEventListener('click',function(){
      document.querySelectorAll('#filterToolbar button').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      activeFilter=btn.dataset.filter;
      applyFilterToTargets(activeFilter);
    });
  });
  document.getElementById('btnToday').addEventListener('click',function(){activeDate=obsNowActiveDate();weatherLoaded=false;updateAstro();ensurePlanisphereClock(true);drawPlanisphere();fetchWeather();});
  document.getElementById('btnPrev').addEventListener('click',function(){if(!canGoPrev()){toast('Puoi andare indietro di 1 notte al massimo.',2500);return;}activeDate=obsMidnight(new Date(obsNoon(activeDate).getTime()-86400000));weatherLoaded=false;updateAstro();ensurePlanisphereClock(true);drawPlanisphere();fetchWeather();});
  document.getElementById('btnNext').addEventListener('click',function(){if(!canGoNext()){toast('Previsioni meteo fino a +3 giorni.',2500);return;}activeDate=obsMidnight(new Date(obsNoon(activeDate).getTime()+86400000));weatherLoaded=false;updateAstro();ensurePlanisphereClock(true);drawPlanisphere();fetchWeather();});
  var northBtns=document.querySelectorAll('#northToolbar button');
  function syncNorthButtons(){ var m=androidNorthMode(); northBtns.forEach(function(b){ b.classList.toggle('active', b.dataset.north===m); }); }
  northBtns.forEach(function(b){ b.addEventListener('click', function(){ safeSet('astroalert_android_north', b.dataset.north); syncNorthButtons(); toast('Nord del sensore: '+(b.dataset.north==='true'?'geografico':'magnetico + WMM'), 2200); }); });
  syncNorthButtons();
  var rp=document.getElementById('btnResetPerms');
  if(rp)rp.addEventListener('click',function(){if(confirm('Vuoi rivedere la schermata introduttiva?'))window.resetAstroAlertOnboarding();});
  var bgr=document.getElementById('btnGlobalRadar');
  if(bgr)bgr.addEventListener('click',function(){openRadar(null);});
  setInterval(function(){if(!document.hidden)updateAstro();},60*1000);
  setInterval(function(){fetchWeather();fetchKp();},5*60*1000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden){updateAstro();fetchWeather();fetchKp();}});
  setTimeout(scheduleFitMetrics, 300);setTimeout(scheduleFitMetrics, 1200);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleFitMetrics);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
