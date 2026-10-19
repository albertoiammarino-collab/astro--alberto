"use strict";
/* Astro Alberto. Meteo, aria, punteggio della notte, indice Kp. I dati non disponibili sono indicati come N/D e le stime non sono presentate come certezze. */
function fetchWeather(){
  var dayOffset = obsDaysFromToday(activeDate);
  var myToken = ++weatherFetchToken;
  var requestedLocation = Number(loc.lat).toFixed(4) + ',' + Number(loc.lon).toFixed(4);
  navBusy = true;
  updateNavButtons();
  fetchAirQuality();

  var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(loc.lat.toFixed(4))
    + '&longitude=' + encodeURIComponent(loc.lon.toFixed(4))
    + '&current=temperature_2m,relative_humidity_2m,dew_point_2m,cloud_cover,wind_speed_10m'
    + '&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,wind_speed_10m,wind_speed_850hPa,wind_speed_250hPa'
    + '&timezone=auto&past_days=1&forecast_days=4';

  function validNumber(value){
    var n = typeof value === 'number' ? value : Number(value);
    return value !== null && value !== undefined && value !== '' && Number.isFinite(n) ? n : null;
  }
  function at(arr, idx){ return Array.isArray(arr) && idx >= 0 && idx < arr.length ? validNumber(arr[idx]) : null; }
  function showNum(value, digits){ return value === null ? 'N/D' : value.toFixed(digits); }
  function displayWeatherUnavailable(message){
    currentWeatherContext.clouds = null;
    currentWeatherContext.jetSpeed = null;
    currentWeatherContext.jetAvailable = false;
    ['mCloudsLive','mCloudsAvg','mTemp','mDew','mWind10','mWind850','mJet','mCloudLayers','mVis'].forEach(function(id){
      var el = document.getElementById(id); if (el) el.textContent = id === 'mTemp' ? 'N/D | N/D' : 'N/D';
    });
    var cond = document.getElementById('mCond'); if (cond) cond.textContent = 'N/D';
    var seeing = document.getElementById('mSeeing'); if (seeing) seeing.textContent = message;
    weatherNight.clouds = null; weatherNight.low = null; weatherNight.mid = null; weatherNight.high = null;
    weatherNight.vis = null; weatherNight.wind = null; weatherNight.minDelta = null;
    updateNightScore();
  }

  fetchJSONTimeout(url, 12000, {cache:'no-store'})
    .then(function(data){
      if (myToken !== weatherFetchToken) return;
      if (requestedLocation !== Number(loc.lat).toFixed(4) + ',' + Number(loc.lon).toFixed(4)) return;

      var locChanged = false;
      if (data.timezone && data.timezone !== OBS_TIMEZONE) {
        OBS_TIMEZONE = data.timezone;
        if (dayOffset === 0) activeDate = obsNowActiveDate();
        locChanged = true;
      }
      if (typeof data.elevation === 'number' && Number.isFinite(data.elevation)
        && (loc.elevSource === 'default' || loc.elevSource === 'pending' || loc.elevSource === 'api')
        && Math.abs(loc.elev - data.elevation) > 0.5) {
        loc.elev = data.elevation;
        loc.elevSource = 'api';
        locChanged = true;
      }
      if (locChanged) { saveLocation(); updateLocLabel(); }
      var current = data.current || {};
      var hourly = data.hourly || {};
      var referenceDate = dayOffset === 0 ? new Date() : obsNoon(activeDate);
      var refIdx = findHourlyIndex(hourly.time, referenceDate);
      // Nessun fallback all'ultima riga: un'ora diversa non è un dato valido per l'ora richiesta.
      var clouds, temp, humidity, dew, wind10;
      if (dayOffset === 0) {
        clouds = validNumber(current.cloud_cover);
        temp = validNumber(current.temperature_2m);
        humidity = validNumber(current.relative_humidity_2m);
        dew = validNumber(current.dew_point_2m);
        wind10 = validNumber(current.wind_speed_10m);
      } else {
        try {
          var observer = new A.Observer(loc.lat, loc.lon, loc.elev);
          var dark = getAstroDarkWindow(observer, activeDate);
          if (dark.start && dark.end) {
            var middle = new Date((dark.start.getTime() + dark.end.getTime()) / 2);
            var middleIndex = findHourlyIndex(hourly.time, middle);
            if (middleIndex >= 0) refIdx = middleIndex;
          }
        } catch (err) { /* lascia l'indice calcolato in precedenza */ }
        clouds = at(hourly.cloud_cover, refIdx);
        temp = at(hourly.temperature_2m, refIdx);
        humidity = at(hourly.relative_humidity_2m, refIdx);
        dew = at(hourly.dew_point_2m, refIdx);
        wind10 = at(hourly.wind_speed_10m, refIdx);
      }
      var wind850 = at(hourly.wind_speed_850hPa, refIdx);
      var jet = at(hourly.wind_speed_250hPa, refIdx);
      var nightIndices = [];
      try { nightIndices = computeNightIdxRange(hourly.time, new A.Observer(loc.lat, loc.lon, loc.elev), activeDate, dayOffset); }
      catch (err) { nightIndices = []; }
      var sumClouds = 0, countClouds = 0;
      nightIndices.forEach(function(idx){ var value = at(hourly.cloud_cover, idx); if (value !== null) { sumClouds += value; countClouds++; } });
      var avgClouds = countClouds ? Math.round(sumClouds / countClouds) : null;
      function nightMean(arr){
        var sum = 0, cnt = 0;
        nightIndices.forEach(function(idx){ var v = at(arr, idx); if (v !== null) { sum += v; cnt++; } });
        return cnt ? sum / cnt : null;
      }
      var minDelta = null;
      nightIndices.forEach(function(idx){
        var t = at(hourly.temperature_2m, idx), dp = at(hourly.dew_point_2m, idx);
        if (t !== null && dp !== null) { var dd = t - dp; if (minDelta === null || dd < minDelta) minDelta = dd; }
      });
      weatherNight.clouds = avgClouds;
      weatherNight.low = nightMean(hourly.cloud_cover_low);
      weatherNight.mid = nightMean(hourly.cloud_cover_mid);
      weatherNight.high = nightMean(hourly.cloud_cover_high);
      var visM = nightMean(hourly.visibility);
      weatherNight.vis = visM === null ? null : visM / 1000;
      weatherNight.wind = nightMean(hourly.wind_speed_10m);
      weatherNight.minDelta = minDelta;

      currentWeatherContext.clouds = clouds === null ? null : Math.round(clouds);
      currentWeatherContext.jetSpeed = jet === null ? null : Math.round(jet);
      currentWeatherContext.jetAvailable = jet !== null;
      var setText = function(id, value){ var el = document.getElementById(id); if (el) el.textContent = value; };
      setText('mCloudsLive', clouds === null ? 'N/D' : Math.round(clouds) + '%');
      setText('mCloudsAvg', avgClouds === null ? 'N/D' : avgClouds + '%');
      setText('mTemp', showNum(temp,1) + '°C | ' + (humidity === null ? 'N/D' : Math.round(humidity)) + '%');
      setText('mDew', showNum(dew,1) + '°C');
      setText('mWind10', wind10 === null ? 'N/D' : Math.round(wind10) + ' km/h');
      setText('mWind850', wind850 === null ? 'N/D' : Math.round(wind850) + ' km/h');
      setText('mJet', jet === null ? 'N/D' : Math.round(jet) + ' km/h');
      var cloudsLabel = document.getElementById('mCloudsLabel');
      if (cloudsLabel) cloudsLabel.textContent = dayOffset === 0 ? 'Nuvolosità ORA (modello):' : 'Nuvolosità notte selezionata:';
      var delta = temp !== null && dew !== null ? temp - dew : null;
      var cond = document.getElementById('mCond');
      if (cond) {
        var riskRef = minDelta !== null ? minDelta : delta;
        var risk = condensationRisk(riskRef);
        cond.innerHTML = delta === null && minDelta === null ? 'N/D'
          : '<span class="tag ' + risk.cls + '">' + risk.label + '</span> Δ ora ' + (delta === null ? 'N/D' : delta.toFixed(1) + '°C')
            + ' · minimo notte ' + (minDelta === null ? 'N/D' : minDelta.toFixed(1) + '°C');
      }
      var layersEl = document.getElementById('mCloudLayers');
      if (layersEl) layersEl.textContent = weatherNight.low === null && weatherNight.mid === null && weatherNight.high === null ? 'N/D'
        : 'basse ' + (weatherNight.low === null ? 'N/D' : Math.round(weatherNight.low) + '%') + ' · medie ' + (weatherNight.mid === null ? 'N/D' : Math.round(weatherNight.mid) + '%') + ' · alte ' + (weatherNight.high === null ? 'N/D' : Math.round(weatherNight.high) + '%');
      var visEl = document.getElementById('mVis');
      if (visEl) visEl.textContent = weatherNight.vis === null ? 'N/D' : itn(weatherNight.vis, 1) + ' km (media della notte, dal modello)';
      updateNightScore();
      var seeing = document.getElementById('mSeeing');
      if (seeing) seeing.innerHTML = '<span class="tag wait">Seeing non stimabile dai soli dati meteo mostrati</span>';
      weatherLoaded = true;
      navBusy = false;
      updateEyepieceAdvice();
      updateAstro();
    })
    .catch(function(){
      if (myToken !== weatherFetchToken) return;
      displayWeatherUnavailable('Dati meteo non disponibili');
      weatherLoaded = false;
      navBusy = false;
      updateEyepieceAdvice();
      updateAstro();
    });
}

var weatherNight = {clouds:null, low:null, mid:null, high:null, vis:null, wind:null, minDelta:null, aod:null, dust:null, dustMax:null, pm10:null};
var moonNight = {illum:null, alt:null};
function condensationRisk(delta){
  // Soglie scelte dall'app, non uno standard. La lastra Schmidt si raffredda sotto la temperatura dell'aria.
  if (delta === null || delta === undefined) return {cls:'wait', label:'N/D'};
  if (delta <= 2) return {cls:'no', label:'CONDENSA: RISCHIO ALTO'};
  if (delta <= 5) return {cls:'low', label:'CONDENSA: RISCHIO MODERATO'};
  return {cls:'good', label:'CONDENSA: RISCHIO BASSO'};
}
var airToken = 0;
function fetchAirQuality(){
  var myToken = ++airToken;
  var dayOffset = obsDaysFromToday(activeDate);
  var requestedLocation = Number(loc.lat).toFixed(4) + ',' + Number(loc.lon).toFixed(4);
  var url = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + encodeURIComponent(loc.lat.toFixed(4))
    + '&longitude=' + encodeURIComponent(loc.lon.toFixed(4))
    + '&hourly=pm10,pm2_5,dust,aerosol_optical_depth&timezone=auto&past_days=1&forecast_days=4';
  var dustEl = document.getElementById('mDust');
  function fail(){
    if (myToken !== airToken) return;
    weatherNight.aod = null; weatherNight.dust = null; weatherNight.dustMax = null; weatherNight.pm10 = null;
    if (dustEl) dustEl.textContent = 'N/D';
    updateNightScore();
  }
  fetchJSONTimeout(url, 12000, {cache:'no-store'}).then(function(data){
    if (myToken !== airToken) return;
    if (requestedLocation !== Number(loc.lat).toFixed(4) + ',' + Number(loc.lon).toFixed(4)) return;
    var hourly = data.hourly || {};
    var idxs = [];
    try { idxs = computeNightIdxRange(hourly.time, new A.Observer(loc.lat, loc.lon, loc.elev), activeDate, dayOffset); } catch (err) { idxs = []; }
    function val(arr, i){ var v = Array.isArray(arr) ? arr[i] : null; return (typeof v === 'number' && isFinite(v)) ? v : null; }
    function mean(arr){ var s2 = 0, c = 0; idxs.forEach(function(i){ var v = val(arr, i); if (v !== null) { s2 += v; c++; } }); return c ? s2 / c : null; }
    function maxOf(arr){ var m = null; idxs.forEach(function(i){ var v = val(arr, i); if (v !== null && (m === null || v > m)) m = v; }); return m; }
    weatherNight.aod = mean(hourly.aerosol_optical_depth);
    weatherNight.dust = mean(hourly.dust);
    weatherNight.dustMax = maxOf(hourly.dust);
    weatherNight.pm10 = mean(hourly.pm10);
    if (dustEl) {
      if (weatherNight.aod === null && weatherNight.dust === null && weatherNight.pm10 === null) dustEl.textContent = 'N/D';
      else {
        var haze = weatherNight.aod === null ? '' : (weatherNight.aod < 0.1 ? 'limpido' : weatherNight.aod < 0.25 ? 'leggermente torbido' : weatherNight.aod < 0.5 ? 'torbido' : 'molto torbido');
        dustEl.textContent = (weatherNight.aod === null ? '' : 'AOD ' + itn(weatherNight.aod, 2) + ' (' + haze + ')')
          + (weatherNight.dust === null ? '' : ' · polvere ' + itn(weatherNight.dust, 0) + ' μg/m³' + (weatherNight.dustMax !== null ? ' (max ' + itn(weatherNight.dustMax, 0) + ')' : ''))
          + (weatherNight.pm10 === null ? '' : ' · PM10 ' + itn(weatherNight.pm10, 0) + ' μg/m³');
      }
    }
    updateNightScore();
  }).catch(fail);
}
var BORTLE_KEY = 'astroalert_bortle';
function getBortle(){
  var v = parseInt(safeGet(BORTLE_KEY), 10);
  return (v >= 1 && v <= 9) ? v : 7;
}
function clamp01(x){ return Math.max(0, Math.min(1, x)); }
function computeNightScore(){
  var parts = [];
  function add(label, max, frac, detail){ if (frac === null || !isFinite(frac)) return; parts.push({label:label, max:max, pts:max * clamp01(frac), detail:detail}); }
  var w = weatherNight;
  add('Nuvolosità', 45, w.clouds === null ? null : 1 - w.clouds / 100, w.clouds === null ? '' : w.clouds + '%');
  var tr = [];
  if (w.aod !== null) tr.push(1 - clamp01(w.aod / 0.5));
  if (w.dust !== null) tr.push(1 - clamp01(w.dust / 100));
  add('Trasparenza', 15, tr.length ? tr.reduce(function(a, b){ return a + b; }, 0) / tr.length : null, '');
  add('Condensa', 10, w.minDelta === null ? null : (w.minDelta - 1) / 4, w.minDelta === null ? '' : 'Δ min ' + itn(w.minDelta, 1) + '°C');
  add('Vento a terra', 10, w.wind === null ? null : 1 - (w.wind - 10) / 25, w.wind === null ? '' : Math.round(w.wind) + ' km/h');
  var moonFrac = null;
  if (moonNight.illum !== null && moonNight.alt !== null) moonFrac = moonNight.alt <= 0 ? 1 : 1 - moonNight.illum * Math.sin(deg2rad(moonNight.alt));
  add('Luna', 10, moonFrac, moonNight.illum === null ? '' : Math.round(moonNight.illum * 100) + '% a ' + Math.round(moonNight.alt) + '°');
  var bortle = getBortle();
  add('Cielo (Bortle)', 10, (9 - bortle) / 8, 'Bortle ' + bortle);
  var sumPts = 0, sumMax = 0;
  parts.forEach(function(p){ sumPts += p.pts; sumMax += p.max; });
  if (!sumMax) return null;
  return {total:Math.round(100 * sumPts / sumMax), parts:parts, maxUsed:sumMax};
}
function updateNightScore(){
  var el = document.getElementById('nightScore');
  if (!el) return;
  var r = computeNightScore();
  if (!r) { el.innerHTML = ''; return; }
  var word = r.total >= 80 ? 'ottima' : r.total >= 60 ? 'buona' : r.total >= 40 ? 'discreta' : r.total >= 20 ? 'scarsa' : 'sfavorevole';
  var rows = r.parts.map(function(p){ return '<span>' + p.label + (p.detail ? ' (' + escapeHtml(p.detail) + ')' : '') + '</span><b>' + itn(p.pts, 0) + '/' + p.max + '</b>'; }).join('');
  el.innerHTML = '<div class="score-block"><div class="score-head"><span>Punteggio della notte</span><b>' + r.total + '/100</b></div>'
    + '<div class="score-bar"><i style="width:' + r.total + '%"></i></div>'
    + '<div class="score-head"><span>Valutazione: ' + word + '</span></div>'
    + '<div class="score-parts">' + rows + '</div>'
    + '<div class="note" style="margin-top:8px">Indice orientativo calcolato dall\'app, non uno standard. Pesi: nuvolosità 45, trasparenza 15, condensa 10, vento 10, Luna 10, Bortle 10. I dati non disponibili sono esclusi e il totale è riscalato su quelli presenti (' + r.maxUsed + ' punti su 100). Nuvolosità, vento e trasparenza sono medie della notte. La Luna è valutata a metà notte. Il Bortle è il valore che imposti tu.</div></div>';
}
function initBortleSelect(){
  var sel = document.getElementById('bortleSel');
  if (!sel) return;
  var names = {1:'1 cielo eccellente', 2:'2 cielo molto buio', 3:'3 cielo rurale', 4:'4 periferia rurale', 5:'5 periferia', 6:'6 periferia luminosa', 7:'7 transizione città', 8:'8 città', 9:'9 centro città'};
  sel.innerHTML = Object.keys(names).map(function(k){ return '<option value="' + k + '">' + names[k] + '</option>'; }).join('');
  sel.value = String(getBortle());
  sel.addEventListener('change', function(){ safeSet(BORTLE_KEY, sel.value); updateNightScore(); });
}

var kpFetchToken = 0;
function fetchKp(){
  var token = ++kpFetchToken;
  fetchJSONTimeout('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', 10000, {cache:'no-store'})
    .then(function(rows){
      if (token !== kpFetchToken) return;
      if (!Array.isArray(rows) || rows.length < 2) throw new Error('Risposta NOAA vuota');
      var dataRow = rows[rows.length - 1];
      var kp = Array.isArray(dataRow) ? Number(dataRow[1]) : Number(dataRow.Kp);
      var el = document.getElementById('mKp');
      if (el) el.textContent = Number.isFinite(kp) ? kp.toFixed(1) : 'N/D';
    })
    .catch(function(){ if (token === kpFetchToken) { var el = document.getElementById('mKp'); if (el) el.textContent = 'N/D'; } });
}
