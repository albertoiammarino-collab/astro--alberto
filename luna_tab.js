"use strict";
/* Astro Alberto. Scheda Luna: siti, crateri, mari e globo 3D. I dati non disponibili sono indicati come N/D e le stime non sono presentate come certezze. */
function initMoonTabs(){
  if(document.body.dataset.moonTabsBound === '1') return;
  document.body.dataset.moonTabsBound = '1';
  document.addEventListener('click', function(e){
    var tab = e.target.closest('.moon-tab');if(!tab) return;
    e.preventDefault();
    var target = tab.getAttribute('data-mtab');if(!target) return;
    document.querySelectorAll('.moon-tab').forEach(function(t){ t.classList.remove('active'); });
    tab.classList.add('active');
    document.querySelectorAll('.moon-tab-content').forEach(function(c){c.style.display = (c.getAttribute('data-mtab-content') === target) ? 'block' : 'none';});
    try {
      if(target === 'globo'){ setTimeout(initMoonGlobe, 100); }
      else if(target === 'siti'){ renderLandingSites(); }
      else if(target === 'crateri'){ renderCratersAndMaria(); }
    } catch(err){ console.error('[MoonTab]', err); }
  }, false);
}
function renderLandingSites(){
  var el = document.getElementById('landingSitesList');
  if(!el || el.dataset.rendered === '1') return;
  el.dataset.rendered = '1';
  var sCard = 'border:1px solid var(--line);background:var(--panel-2);border-radius:8px;padding:10px 12px;margin-bottom:6px;cursor:pointer';
  var sName = 'font-size:var(--fs-md);font-weight:700;color:var(--text);line-height:1.3';
  var sMeta = 'font-size:var(--fs-sm);color:var(--muted);margin-top:4px;line-height:1.4';
  var sCoord = 'font-family:var(--mono);font-size:var(--fs-xs);color:var(--muted);margin-top:3px';
  var sGo = 'float:right;color:var(--amber);font-size:11px;font-weight:600';
  el.innerHTML = LUNAR_LANDING_SITES.map(function(s, idx){
    var flag = s.country.indexOf('USA') === 0 ? '🇺🇸' : s.country === 'URSS' ? '🇷🇺' : s.country === 'Cina' ? '🇨🇳' : s.country === 'India' ? '🇮🇳' : s.country === 'Giappone' ? '🇯🇵' : '🌍';
    return '<div class="globe-link site-link" style="'+sCard+'" data-globe-idx="'+idx+'">'
      + '<div style="'+sName+'">' + flag + ' ' + escapeHtml(s.name) + ' <span style="font-size:var(--fs-sm);color:var(--muted);font-weight:400">(' + s.year + ')</span> <span style="'+sGo+'">🌕 Vai al globo</span></div>'
      + '<div style="'+sCoord+'">Lat ' + s.lat.toFixed(2) + '° · Lon ' + s.lon.toFixed(2) + '°</div>'
      + '<div style="'+sMeta+'">' + escapeHtml(s.mission) + '</div>'
      + '<div style="'+sMeta+';color:var(--muted-2);font-size:var(--fs-xs)">' + escapeHtml(s.desc) + '</div>'
      + '</div>';
  }).join('');
  el.querySelectorAll('.site-link').forEach(function(card){
    card.addEventListener('click', function(){var idx = parseInt(card.dataset.globeIdx, 10);var s = LUNAR_LANDING_SITES[idx];if(s) focusGlobeOn(s.name, s.lat, s.lon);});
  });
}
function renderCratersAndMaria(){
  var el = document.getElementById('cratersList');
  if(!el || el.dataset.rendered === '1') return;
  el.dataset.rendered = '1';
  var sLbl = 'font-family:var(--mono);font-size:var(--fs-xs);color:var(--amber);font-weight:700;letter-spacing:.05em;margin:14px 0 6px;padding-bottom:4px;border-bottom:1px solid var(--line)';
  var sCard = 'border:1px solid var(--line);background:var(--panel-2);border-radius:8px;padding:10px 12px;margin-bottom:6px;cursor:pointer';
  var sName = 'font-size:var(--fs-md);font-weight:700;color:var(--text);line-height:1.3';
  var sCoord = 'font-family:var(--mono);font-size:var(--fs-xs);color:var(--muted);margin-top:3px';
  var sMeta = 'font-size:var(--fs-sm);color:var(--muted);margin-top:4px;line-height:1.4';
  var sGo = 'float:right;color:var(--amber);font-size:11px;font-weight:600';
  var html = '<div style="'+sLbl+'">CRATERI PRINCIPALI <span style="color:#51a0d5">●</span></div>';
  LUNAR_CRATERS.forEach(function(c, idx){
    html += '<div class="globe-link crater-link" style="'+sCard+'" data-globe-idx="'+idx+'">'
      + '<div style="'+sName+'">' + escapeHtml(c.name) + ' <span style="font-size:var(--fs-xs);color:var(--muted);font-weight:400">Ø ' + c.diameter + ' km</span> <span style="'+sGo+'">🌕 Vai al globo</span></div>'
      + '<div style="'+sCoord+'">Lat ' + c.lat + '° · Lon ' + c.lon + '°</div>'
      + '<div style="'+sMeta+'">' + escapeHtml(c.desc) + '</div>'
      + '</div>';
  });
  html += '<div style="'+sLbl+'">MARI E OCEANI <span style="color:#2ecc71">●</span></div>';
  LUNAR_MARIA.forEach(function(m, idx){
    html += '<div class="globe-link maria-link" style="'+sCard+'" data-globe-idx="'+idx+'">'
      + '<div style="'+sName+'">' + escapeHtml(m.nameIt) + ' <span style="font-size:var(--fs-xs);color:var(--muted);font-weight:400">(' + escapeHtml(m.name) + ')</span> <span style="'+sGo+'">🌕 Vai al globo</span></div>'
      + '<div style="'+sCoord+'">Lat ' + m.lat + '° · Lon ' + m.lon + '° · ' + m.area.toLocaleString('it-IT') + ' km²</div>'
      + '<div style="'+sMeta+'">' + escapeHtml(m.desc) + '</div>'
      + '</div>';
  });
  html += '<div style="'+sLbl+'">CATENE MONTUOSE <span style="color:#c77dff">●</span></div>';
  LUNAR_MOUNTAINS.forEach(function(m, idx){
    html += '<div class="globe-link mountain-link" style="'+sCard+'" data-globe-idx="'+idx+'">'
      + '<div style="'+sName+'">' + escapeHtml(m.nameIt) + ' <span style="font-size:var(--fs-xs);color:var(--muted);font-weight:400">(' + escapeHtml(m.name) + ')</span> <span style="'+sGo+'">🌕 Vai al globo</span></div>'
      + '<div style="'+sCoord+'">Lat ' + m.lat + '° · Lon ' + m.lon + '° · ' + m.length + ' km</div>'
      + '<div style="'+sMeta+'">' + escapeHtml(m.desc) + '</div>'
      + '</div>';
  });
  el.innerHTML = html;
  el.querySelectorAll('.crater-link').forEach(function(card){card.addEventListener('click', function(){var idx = parseInt(card.dataset.globeIdx, 10);var c = LUNAR_CRATERS[idx];if(c) focusGlobeOn(c.name, c.lat, c.lon);});});
  el.querySelectorAll('.maria-link').forEach(function(card){card.addEventListener('click', function(){var idx = parseInt(card.dataset.globeIdx, 10);var m = LUNAR_MARIA[idx];if(m) focusGlobeOn(m.nameIt, m.lat, m.lon);});});
  el.querySelectorAll('.mountain-link').forEach(function(card){card.addEventListener('click', function(){var idx = parseInt(card.dataset.globeIdx, 10);var m = LUNAR_MOUNTAINS[idx];if(m) focusGlobeOn(m.nameIt, m.lat, m.lon);});});
}
var moonGlobeInstance = null;
var _moonGlobeFilter = 'all';
var _moonGlobeItems = [];
var _moonGlobeViewPOV = {lat:0, lng:0, altitude:2.2};
var _moonGlobeAutoRotate = false;
var _moonGlobeHighlight = null;

function buildMoonGlobeData(){
  var items = [];
  LUNAR_LANDING_SITES.forEach(function(s){items.push({type:'landing',name:s.name,lat:s.lat,lng:s.lon,color:'#f2b84b',size:1.1,subtitle:s.mission,desc:s.desc+' ('+s.year+')'});});
  LUNAR_CRATERS.forEach(function(c){items.push({type:'crater',name:c.name,lat:c.lat,lng:c.lon,color:'#51a0d5',size:0.9,subtitle:'Cratere · Ø '+c.diameter+' km',desc:c.desc});});
  LUNAR_MARIA.forEach(function(m){items.push({type:'maria',name:m.nameIt,lat:m.lat,lng:m.lon,color:'#2ecc71',size:1.3,subtitle:'Mare · '+m.name,desc:m.desc});});
  LUNAR_MOUNTAINS.forEach(function(m){items.push({type:'mountain',name:m.nameIt,lat:m.lat,lng:m.lon,color:'#c77dff',size:1.0,subtitle:'Catena montuosa · '+m.name,desc:m.desc+' ('+m.length+' km)'});});
  return items;
}
function focusGlobeOn(name, lat, lon){
  _moonGlobeHighlight = name;
  var tabs = document.querySelectorAll('.moon-tab');
  for(var i=0; i<tabs.length; i++){if(tabs[i].getAttribute('data-mtab') === 'globo'){tabs[i].click();break;}}
  var tries = 0;
  function tryFocus(){
    tries++;
    if(moonGlobeInstance){
      try {moonGlobeInstance.pointOfView({ lat: lat, lng: lon, altitude: 1.4 }, 900);} catch(e){}
      var ab=document.querySelector('.moon-filter[data-mfilter="all"]');if(ab&&_moonGlobeFilter!=='all')ab.click();
      refreshHighlight();
      var item = null;
      for(var k=0; k<_moonGlobeItems.length; k++){if(_moonGlobeItems[k].name === name){ item = _moonGlobeItems[k]; break; }}
      if(item) showMoonGlobeInfo(item);
      toast('🎯 ' + name, 2500);
    } else if(tries < 40){setTimeout(tryFocus, 100);}
  }
  setTimeout(tryFocus, 250);
}
function updateGlobeCompass(){
  var coordEl = document.getElementById('globeCompassCoords');
  if(!coordEl) return;
  var lat = Math.round(_moonGlobeViewPOV.lat);var lon = Math.round(_moonGlobeViewPOV.lng);var lonTxt;
  if(lon === 0) lonTxt = "0°"; else if(lon > 0) lonTxt = "+" + lon + "°"; else lonTxt = lon + "°";
  coordEl.textContent = "lat " + lat + "° · lon " + lonTxt;
}
function initMoonGlobe(){
  if(moonGlobeInstance) return;
  var container = document.getElementById('moonGlobeContainer');
  if(!container) return;
  _moonGlobeItems = buildMoonGlobeData();
  if(!document.body.dataset.moonGlobeFiltersBound){
    document.body.dataset.moonGlobeFiltersBound = '1';
    document.addEventListener('click', function(e){
      var btn = e.target.closest('.moon-filter');if(!btn) return;
      e.preventDefault();
      document.querySelectorAll('.moon-filter').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      _moonGlobeFilter = btn.getAttribute('data-mfilter') || 'all';
      applyMoonFilter();
    }, false);
  }
  if(!document.body.dataset.moonGlobeControlsBound){
    document.body.dataset.moonGlobeControlsBound = '1';
    document.addEventListener('click', function(e){
      var btnZoomIn = e.target.closest('#globeZoomIn');
      if(btnZoomIn && moonGlobeInstance){var pov = moonGlobeInstance.pointOfView();var newAlt = Math.max(0.6, (pov.altitude || 2.2) * 0.75);moonGlobeInstance.pointOfView({ altitude: newAlt }, 300);return;}
      var btnZoomOut = e.target.closest('#globeZoomOut');
      if(btnZoomOut && moonGlobeInstance){var pov2 = moonGlobeInstance.pointOfView();var newAlt2 = Math.min(5.0, (pov2.altitude || 2.2) * 1.33);moonGlobeInstance.pointOfView({ altitude: newAlt2 }, 300);return;}
      var btnReset = e.target.closest('#globeReset');
      if(btnReset && moonGlobeInstance){deselectAll();moonGlobeInstance.pointOfView({ lat: 0, lng: 0, altitude: 2.2 }, 500);toast('Vista resettata', 1500);return;}
      var btnDeselect = e.target.closest('#btnDeselect');
      if(btnDeselect){deselectAll();toast('Selezione rimossa', 1500);return;}
      var btnAuto = e.target.closest('#globeAutoRotate');
      if(btnAuto && moonGlobeInstance){
        _moonGlobeAutoRotate = !_moonGlobeAutoRotate;
        var controls = moonGlobeInstance.controls();
        controls.autoRotate = _moonGlobeAutoRotate;controls.autoRotateSpeed = 0.08;
        if(_moonGlobeAutoRotate){btnAuto.classList.add('playing');btnAuto.textContent = '⏸';btnAuto.title = 'Ferma rotazione';}
        else {btnAuto.classList.remove('playing');btnAuto.textContent = '▶';btnAuto.title = 'Rotazione automatica';}
        return;
      }
    }, false);
  }
  try {
    moonGlobeInstance = new Globe(container)
      .globeImageUrl('https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/moon_1024.jpg')
      .backgroundColor('#000').showAtmosphere(false).showGraticules(false)
      .width(container.clientWidth).height(container.clientHeight);
  } catch(err){console.error('[MoonGlobe] Init error', err);return;}
  try {
    var controls = moonGlobeInstance.controls();
    controls.autoRotate = _moonGlobeAutoRotate;controls.autoRotateSpeed = 0.08;
    controls.enableZoom = true;controls.enablePan = false;controls.enableDamping = true;
    controls.dampingFactor = 0.08;controls.minDistance = 150;controls.maxDistance = 800;
    var compassUpdateScheduled = false;
    controls.addEventListener('change', function(){
      if(compassUpdateScheduled) return;
      compassUpdateScheduled = true;
      requestAnimationFrame(function(){
        compassUpdateScheduled = false;
        try {var pov = moonGlobeInstance.pointOfView();_moonGlobeViewPOV.lat = pov.lat || 0;_moonGlobeViewPOV.lng = pov.lng || 0;_moonGlobeViewPOV.altitude = pov.altitude || 2.2;updateGlobeCompass();} catch(e) {}
      });
    });
  }catch(e){ }
  try {moonGlobeInstance.pointOfView({ lat: 0, lng: 0, altitude: 2.2 }, 0);_moonGlobeViewPOV = { lat:0, lng:0, altitude:2.2 };updateGlobeCompass();}catch(e){}
  moonGlobeInstance
    .pointsData(_moonGlobeItems)
    .pointLat('lat').pointLng('lng')
    .pointColor(function(d){ return d.color; })
    .pointAltitude(0.04)
    .pointRadius(function(d){ return d.size; })
    .pointResolution(24)
    .pointsMerge(false)
    .pointsTransitionDuration(0)
    .pointLabel(function(d){
      return '<div class="globe-tooltip"><b>' + escapeHtml(d.name) + '</b><br>'
        + '<span class="tooltip-desc">' + escapeHtml(d.subtitle) + '</span><br>'
        + '<span class="tooltip-desc">' + escapeHtml(d.desc) + '</span></div>';
    })
    .onPointClick(function(d){
      _moonGlobeHighlight = d.name;
      showMoonGlobeInfo(d);
      toast(d.name + ' · ' + d.subtitle, 3000);
      refreshHighlight();
      try { moonGlobeInstance.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.4 }, 700); } catch(e) {}
    });
  moonGlobeInstance.ringsData([]).ringLat('lat').ringLng('lng').ringColor(function(){ return 'rgba(255,255,255,0.95)'; }).ringMaxRadius(5).ringPropagationSpeed(3).ringRepeatPeriod(700).ringResolution(64);
  moonGlobeInstance.labelsData([]).labelLat('lat').labelLng('lng').labelText('text').labelSize(function(d){ return d.size || 0.8; }).labelDotRadius(0.25).labelColor(function(d){ return d.color || '#fff'; }).labelResolution(2).labelAltitude(0.06);
  setTimeout(function(){updateGlobeCompass();},250);
  window.addEventListener('resize', function(){
    if(moonGlobeInstance && container.clientWidth > 0){moonGlobeInstance.width(container.clientWidth);moonGlobeInstance.height(container.clientHeight);}
  });
}
function refreshHighlight(){
  if(!moonGlobeInstance) return;
  var hl = _moonGlobeHighlight;
  var visible = _moonGlobeItems.filter(function(it){return _moonGlobeFilter === 'all' || it.type === _moonGlobeFilter;});
  var rings = [], labels = [];
  if(hl){
    for(var i=0;i<visible.length;i++){
      if(visible[i].name === hl){
        rings.push({lat:visible[i].lat, lng:visible[i].lng});
        labels.push({lat:visible[i].lat, lng:visible[i].lng, text:visible[i].name, color:visible[i].color});
        break;
      }
    }
  }
  moonGlobeInstance.ringsData(rings);
  moonGlobeInstance.labelsData(labels);
}
function applyMoonFilter(){
  if(!moonGlobeInstance) return;
  var filtered = _moonGlobeItems.filter(function(it){return _moonGlobeFilter === 'all' || it.type === _moonGlobeFilter;});
  moonGlobeInstance.pointsData(filtered);
  refreshHighlight();
}
function deselectAll(){
  _moonGlobeHighlight = null;
  refreshHighlight();
  var infoEl = document.getElementById('moonGlobeInfo');
  if(infoEl){
    infoEl.classList.add('empty');
    infoEl.textContent = 'Tocca un punto sul globo o clicca una voce dalle tab Siti / Crateri per vedere i dettagli.';
  }
}
function showMoonGlobeInfo(item){
  var infoEl = document.getElementById('moonGlobeInfo');
  if(!infoEl) return;
  infoEl.classList.remove('empty');
  infoEl.innerHTML = '<div class="info-head">'
    + '<span class="info-dot" style="background:' + item.color + '"></span>'
    + '<span class="info-name">' + escapeHtml(item.name) + '</span>'
    + '</div>'
    + '<div class="info-line">' + escapeHtml(item.subtitle) + '</div>'
    + '<div class="info-line">' + escapeHtml(item.desc) + '</div>'
    + '<div class="info-coord">Lat ' + item.lat.toFixed(2) + '° · Lon ' + item.lng.toFixed(2) + '°</div>';
}
