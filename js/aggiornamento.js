"use strict";
/* Astro Alberto. Aggiornamento dei dati astronomici della pagina. I dati non disponibili sono indicati come N/D e le stime non sono presentate come certezze. */
function updateEyepieceAdvice(){
  var rows=document.querySelectorAll('table.eyepiece-table tr.ep-row');
  var cloudy=weatherLoaded && typeof currentWeatherContext.clouds==='number' && currentWeatherContext.clouds>70;
  rows.forEach(function(row){
    row.classList.toggle('warn-row',cloudy);
    var oldBadge=row.querySelector('.ep-badge');if(oldBadge)oldBadge.remove();
    if(cloudy){var lastTd=row.querySelector('td:last-child');if(lastTd){var badge=document.createElement('span');badge.className='ep-badge';badge.textContent='NUVOLE';lastTd.appendChild(badge);}}
  });
  var note=document.getElementById('eyepieceLiveNote');
  if(note){
    if(!weatherLoaded)note.innerHTML='<b>Adattamento live:</b> meteo in attesa.';
    else if(cloudy)note.innerHTML='<b>Adattamento live:</b> nuvolosità prevista elevata ('+currentWeatherContext.clouds+'%).';
    else note.innerHTML='<b>Adattamento live:</b> parti da 135x e aumenta solo dopo la verifica visuale. Barlow + 25 mm (163x) è una buona alternativa intermedia.';
  }
}
function canGoPrev(){return daysFromToday(activeDate) > -1;}
function canGoNext(){return daysFromToday(activeDate) < 3;}
function updateNavButtons(){
  var bp=document.getElementById('btnPrev');var bn=document.getElementById('btnNext');
  if(bp){bp.disabled=navBusy||!canGoPrev();}
  if(bn){bn.disabled=navBusy||!canGoNext();}
}
function updateAstroDebug(obs){
  var el=document.getElementById('astroDebugContent');
  if(!el)return;
  var now=new Date();
  var sunState = getSunState(obs, now);
  var lines=[];
  lines.push(padLabel('Ora sistema UTC:') + fmtSystemUTC(now));
  lines.push(padLabel('Ora locale:') + fmtLocalDateTime(now));
  lines.push(padLabel('Osservatore:') + 'Lat. ' + loc.lat.toFixed(4) + '°   Lon. ' + loc.lon.toFixed(4) + '°   Elev. ' + loc.elev + ' m');
  lines.push(padLabel('Località:') + loc.name);
  var declinationText = OBS_MAG_DECL === null ? 'N/D (' + OBS_MAG_DECL_STATE + ')' : (OBS_MAG_DECL >= 0 ? '+' : '') + OBS_MAG_DECL.toFixed(2) + '° (' + OBS_MAG_DECL_STATE + ')';
  lines.push(padLabel('Declinazione:') + declinationText + ' · <a href="https://www.ncei.noaa.gov/products/world-magnetic-model" target="_blank" rel="noopener">WMM / NOAA</a>');
  lines.push('');
  var sunLabel;
  if(sunState.isDay) sunLabel = '<span class="day">GIORNO</span> (Sole alt='+sunState.alt.toFixed(2)+'°)';
  else if(sunState.isCivilTwilight) sunLabel = 'CREPUSCOLO CIVILE (Sole alt='+sunState.alt.toFixed(2)+'°)';
  else if(sunState.isNauticalTwilight) sunLabel = 'CREPUSCOLO NAUTICO (Sole alt='+sunState.alt.toFixed(2)+'°)';
  else if(sunState.isAstronomicalTwilight) sunLabel = 'CREPUSCOLO ASTRONOMICO (Sole alt='+sunState.alt.toFixed(2)+'°)';
  else sunLabel = '<span class="up">NOTTE PIENA</span> (Sole alt='+sunState.alt.toFixed(2)+'°)';
  lines.push(padLabel('Sole:') + sunLabel);
  el.innerHTML='\n'+lines.join('\n');
}

function updateAstro(){
  if(typeof Astronomy==='undefined')return;
  var obs=new A.Observer(loc.lat,loc.lon,loc.elev);var now=new Date();
  var sunState = getSunState(obs, now);
  updateAstroDebug(obs);
  var win=getNightWindow(obs,activeDate);
  var isTonight = sameObsDay(activeDate, obsNowActiveDate());
  var dateTitleFmt = obsDateFmt({weekday:'long',day:'numeric',month:'long',year:'numeric'});
  document.getElementById('dateTitle').textContent="Notte di "+dateTitleFmt.format(win.start)+(isTonight?' (stasera)':'');
  document.getElementById('sunCycle').textContent=fmtTime(win.start)+" → "+fmtTime(win.end);
  var darkW=getAstroDarkWindow(obs,activeDate);
  var dusk=darkW.start?{date:darkW.start}:null;
  var dawn=darkW.end?{date:darkW.end}:null;
  var darkEl=document.getElementById('astroDark');
  if(dusk&&dawn)darkEl.textContent=fmtTime(dusk.date)+" → "+fmtTime(dawn.date);
  else darkEl.textContent="Notte bianca";

  var midNight=(dusk&&dawn)?new Date((dusk.date.getTime()+dawn.date.getTime())/2):addHours(win.start,5);
  var graphRef=midNight;

  var moonData=getBodyCycle(A.Body.Moon,obs,graphRef,2);
  var moonEqNow=A.Equator(A.Body.Moon,now,obs,true,true);
  var moonHorNow=A.Horizon(now,obs,moonEqNow.ra,moonEqNow.dec,'normal');
  var moonIsUpNow=moonHorNow.altitude>0;
  var moonIllumNow=A.Illumination(A.Body.Moon,now);
  var moonMag=moonIllumNow.mag;
  var moonObservable=moonIsUpNow&&isObservableUnderSun(sunState.alt,moonMag,'Moon',obs,now);
  var moonIllum=A.Illumination(A.Body.Moon,graphRef);
  var phaseAngle=A.MoonPhase(graphRef);
  var fMoon=moonIllum.phase_fraction;
  var waxing=phaseAngle<180;
  var phaseNames=[[12,"Luna Nuova"],[82,"Luna Crescente"],[98,"Primo Quarto"],[168,"Gibbosa Crescente"],[192,"Luna Piena"],[262,"Gibbosa Calante"],[278,"Ultimo Quarto"],[348,"Luna Calante"],[360,"Luna Nuova"]];
  var phaseName="Luna Nuova";
  for(var pn=0;pn<phaseNames.length;pn++){if(phaseAngle<=phaseNames[pn][0]){phaseName=phaseNames[pn][1];break;}}
  var moonDistKm=moonIllum.geo_dist*KM_PER_AU;
  var moonDiamArcmin=((206264.8*(2*1737.4)/moonDistKm)/60).toFixed(1);
  currentMoonDiamArcmin=parseFloat(moonDiamArcmin);
  var moonEqRef=A.Equator(A.Body.Moon,graphRef,obs,true,true);
  var moonCons=CON(moonEqRef.ra,moonEqRef.dec);
  moonNight.illum=fMoon;
  moonNight.alt=A.Horizon(graphRef,obs,moonEqRef.ra,moonEqRef.dec,'normal').altitude;
  document.getElementById('moonSvgWrap').innerHTML=moonPhaseSVG(fMoon,waxing,44);
  document.getElementById('moonNameTxt').textContent=phaseName+' ('+Math.round(fMoon*100)+'%)';
  var visTag=document.getElementById('moonVisTag');
  if(moonObservable){ visTag.className='tag good'; visTag.textContent=sunState.isDay?'VISIBILE DI GIORNO':'ORA VISIBILE'; }
  else if(moonIsUpNow && sunState.isDay){ visTag.className='tag day'; visTag.textContent='SOPRA MA NON VISIBILE'; }
  else if(moonIsUpNow){ visTag.className='tag low'; visTag.textContent='SOPRA (LUCE SOLARE)'; }
  else { visTag.className='tag no'; visTag.textContent='SOTTO ORIZZONTE'; }
  document.getElementById('moonSubTxt').textContent="Diametro "+moonDiamArcmin+"' · in "+moonCons.name;
  var moonSafetyEl=document.getElementById('moonSunSafety');
  if(moonSafetyEl) moonSafetyEl.innerHTML=(moonIsUpNow&&sunState.isDay)?sunSafetyHTML(solarSeparationDegrees('Moon',obs,now),sunState):'';
  var moonMagBox=document.getElementById('moonMagBox');
  moonMagBox.className='pmag moon-mag '+magBrightnessClass(moonMag);
  moonMagBox.innerHTML=magHTML(moonMag);
  var moonDistObj=formatDistanceLines(moonDistKm,false);
  var moonMassObj=formatMassLines(MOON_MASS_RATIO);
  document.getElementById('moonMetricsWrap').innerHTML=metricsBlockHTML(moonDistObj,moonMassObj);
  document.getElementById('moonNowPos').innerHTML=moonIsUpNow?"Ora: <b>"+compassDir(moonHorNow.azimuth)+"</b> ("+Math.round(moonHorNow.azimuth)+"°), <b>"+Math.round(moonHorNow.altitude)+"°</b> sopra l'orizzonte":"<span style='color:var(--muted-2)'>Ora: sotto l'orizzonte</span>";
  document.getElementById('moonTrack').innerHTML=sparkSVG(moonData.pts,now,moonData.win,moonData.rise,moonData.peak.t,moonData.set,moonObservable,isTonight);
  document.getElementById('moonTimesRow').innerHTML="<span>Sorge: "+fmtTime(moonData.rise)+"</span><span>Picco: "+Math.round(moonData.peak.alt)+"° ("+fmtTime(moonData.peak.t)+")</span><span>Tramonta: "+fmtTime(moonData.set)+"</span>";
  var moonCulm = absoluteCulmination('Moon', obs, graphRef, win.start, win.end);
  var moonCulmQ = moonCulm ? observabilityQuality(moonCulm.alt) : null;
  var moonTransitLineEl = document.getElementById('moonTransitLine');
  if(moonCulm){
    moonTransitLineEl.innerHTML = 'Culmina alle <b>'+fmtTime(moonCulm.time)+'</b> a <b>'+Math.round(moonCulm.alt)+'°</b> <span class="culm-quality '+(moonCulmQ?moonCulmQ.key:'marginal')+'">'+(moonCulmQ?moonCulmQ.label:'N/D')+'</span>';
  } else {
    moonTransitLineEl.innerHTML = '';
  }
  document.getElementById('moonEyepieceTxt').textContent=getDynamicEyepieceAdvice("Moon",moonData.peak.alt, moonCulm?moonCulm.alt:null);
  updateMoonFieldText();
  renderEyepieceTable();
  renderMoonTerminator(graphRef, now, moonData.peak.alt);
  var mh=document.getElementById('moonHeaderBox');
  if(mh) mh.onclick=function(){openCelestialModal("Moon");};
  var bmAR=document.getElementById('btnMoonAR');
  if(bmAR) bmAR.onclick=function(e){e.stopPropagation();startAR("Moon");};
  var bmR=document.getElementById('btnMoonRadar');
  if(bmR) bmR.onclick=function(e){e.stopPropagation();openRadar(resolveTarget('Moon'));};

  var container=document.getElementById('planetCards');
  if(!container)return;
  container.innerHTML="";
  var candidates=[];
  var planetsList=["Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Mercury"];
  var planetRenderQueue=[];
  var nightRefForCulm = new Date((win.start.getTime()+win.end.getTime())/2);

  planetsList.forEach(function(pKey){
    var body=A.Body[pKey];var data=PLANET_DATA[pKey];
    var pData=getBodyCycle(body,obs,graphRef,1);
    var illum=A.Illumination(body,pData.peak.t);
    var kmDist=illum.geo_dist*KM_PER_AU;
    var diam=(206264.8*(2*data.radius)/kmDist).toFixed(1);
    var eqPeakJ2000=A.Equator(body,pData.peak.t,obs,false,true);
    var cons=CON(eqPeakJ2000.ra,eqPeakJ2000.dec);
    var ac=altCategory(pData.peak.alt);
    var cur=currentAltAz(body, obs, now);
    var isGeomUpNow=cur.isUp;
    var illumNow=A.Illumination(body,now);
    var magNow=illumNow.mag;
    var isObservableNow=isGeomUpNow && isObservableUnderSun(sunState.alt, magNow, pKey, obs, now);
    var nowRow;
    if(!isGeomUpNow) nowRow='<div class="nowpos dimtxt">Ora: sotto l\'orizzonte ('+Math.round(cur.hor.altitude)+'°)</div>';
    else if(!isObservableNow) nowRow='<div class="nowpos dimtxt">Ora: geometricamente '+Math.round(cur.hor.altitude)+'° ('+compassDir(cur.hor.azimuth)+') ma cielo troppo luminoso per mag '+magNow.toFixed(1)+'</div>';
    else nowRow='<div class="nowpos">Ora: '+compassDir(cur.hor.azimuth)+' ('+Math.round(cur.hor.azimuth)+'°), '+Math.round(cur.hor.altitude)+'° sopra l\'orizzonte</div>';
    var np=bestBody(body,obs,win.start,win.end);
    if(np.alt>5){
      var absCulm = absoluteCulmination(pKey, obs, nightRefForCulm, win.start, win.end);
      var culmAlt = absCulm ? absCulm.alt : np.alt;
      var q = observabilityQuality(culmAlt);
      candidates.push({key:pKey,name:data.name,maxAlt:np.alt,maxTime:np.time,maxAz:np.az,mag:illum.mag,diam:diam,cons:cons.name,distKm:kmDist,url:data.url,absCulm:absCulm,culmQuality:q.key,culmAlt:culmAlt});
    }

    var absCulmP = absoluteCulmination(pKey, obs, nightRefForCulm, win.start, win.end);
    var culmAltP = absCulmP ? absCulmP.alt : pData.peak.alt;
    var qP = observabilityQuality(culmAltP);
    var pDistObj=formatDistanceLines(kmDist,false);
    var pMassObj=formatMassLines(data.massRatio);
    var metricsHTMLBlock=metricsBlockHTML(pDistObj,pMassObj);
    var visBadge;
    if(isObservableNow) visBadge='<span class="tag good">'+(sunState.isDay?'VISIBILE DI GIORNO':'ORA VISIBILE')+'</span>'+(sunState.isDay?sunSafetyHTML(solarSeparationDegrees(pKey,obs,now),sunState):'');
    else if(isGeomUpNow && sunState.isDay) visBadge='<span class="tag day">SOPRA MA NON VISIBILE</span>';
    else if(isGeomUpNow) visBadge='<span class="tag low">SOPRA (LUCE SOLARE)</span>';
    else visBadge='<span class="tag no">SOTTO ORIZZONTE</span>';

    var culmBlockHtml = '';
    if(absCulmP){
      var outsideClassP = absCulmP.inNightWindow ? '' : ' outside';
      var outsideNoteP = absCulmP.inNightWindow ? '' : '<div class="culm-note">Culminazione assoluta fuori dalla notte. Il picco osservabile stanotte è alle '+fmtTime(np.time)+'.</div>';
      culmBlockHtml = '<div class="culm-block'+outsideClassP+'">'
        + '<div class="culm-row"><span class="k">Picco stanotte:</span><span class="v">'+fmtTime(np.time)+' a <b>'+Math.round(np.alt)+'°</b></span></div>'
        + '<div class="culm-row"><span class="k">Culmina a:</span><span class="v">'+fmtTime(absCulmP.time)+' a <b>'+Math.round(absCulmP.alt)+'°</b> <span class="culm-quality '+qP.key+'">'+qP.label+'</span></span></div>'
        + outsideNoteP
        + '</div>';
    } else {
      culmBlockHtml = '<div class="culm-block"><div class="culm-row"><span class="k">Picco stanotte:</span><span class="v">'+fmtTime(np.time)+' a <b>'+Math.round(np.alt)+'°</b></span></div></div>';
    }

    var html='<div class="prow1"><div class="pname">'+data.name+' <span class="cost">· '+cons.name+'</span></div><div class="pmag '+magBrightnessClass(magNow)+'">'+magHTML(magNow)+'</div></div>'
      +'<div style="margin:4px 0 6px">'+visBadge+'</div>'+ metricsHTMLBlock + nowRow + planetExtraHTML(pKey, now)
      + culmBlockHtml
      +'<div class="ptrack">'+sparkSVG(pData.pts,now,pData.win,pData.rise,pData.peak.t,pData.set,isObservableNow,isTonight)+'</div>'
      +'<div class="prow2"><span>Sorge: '+fmtTime(pData.rise)+'</span><span>Picco: '+Math.round(pData.peak.alt)+'° ('+fmtTime(pData.peak.t)+')</span><span>Tramonta: '+fmtTime(pData.set)+'</span></div>'
      +'<div class="verdict"><b>'+ac.label+'</b> · diametro '+diam+'" · '+magCategory(illum.mag)+'<span class="eyepiece-advice">'+getDynamicEyepieceAdvice(pKey,pData.peak.alt,culmAltP)+'</span><div class="beginner-guide"><b>Guida per principianti:</b> '+data.guide+'</div></div>'
      +'<div class="astrolinks"><a href="'+data.url+'" target="_blank" rel="noopener">Scheda EduINAF ↗</a><button type="button" class="btn-ar-inline ar" data-ar="'+pKey+'">📷 Inquadra</button></div>';
    planetRenderQueue.push({pKey:pKey,isUpNow:isObservableNow,magNow:magNow,altNow:cur.hor.altitude,html:html,ac:ac});
  });
  planetRenderQueue.sort(function(a,b){
    if(a.isUpNow!==b.isUpNow)return a.isUpNow?-1:1;
    if(a.magNow!==b.magNow)return a.magNow-b.magNow;
    return b.altNow-a.altNow;
  });
  planetRenderQueue.forEach(function(item){
    var card=document.createElement('div');
    card.className="planet-box"+(item.ac.dim?" dim":"");
    card.setAttribute('data-key',item.pKey);
    card.innerHTML=item.html;
    card.addEventListener('click',function(e){if(e.target.closest('a,button')) return;openCelestialModal(item.pKey);});
    var arBtn=card.querySelector('[data-ar]');
    if(arBtn)arBtn.addEventListener('click',function(e){e.stopPropagation();e.preventDefault();startAR(item.pKey);});
    container.appendChild(card);
  });

  var moonInfoForTargets={illumFrac:fMoon,altAt:moonHorNow.altitude};
  renderNightTargets(obs,win.start,win.end,candidates,moonInfoForTargets,sunState);

  var pointerEl=document.getElementById('pointingTarget');
  var validTargets=candidates.filter(function(c){return c.maxAlt>=18;});
  if(validTargets.length>0){
    validTargets.sort(function(a,b){return (b.maxAlt-b.mag*3)-(a.maxAlt-a.mag*3);});
    var best=validTargets[0];
    var bestAbs = best.absCulm;
    var bestDistObj=formatDistanceLines(best.distKm,false);
    var bestMassObj=formatMassLines(PLANET_DATA[best.key].massRatio);
    var bestQ = best.culmQuality ? ({excellent:'ECCELLENTE', good:'BUONA', fair:'DISCRETA', poor:'MARGINALE', marginal:'NON OSSERVABILE'})[best.culmQuality] : '';
    pointerEl.innerHTML='<div class="point-card">'
      +'<div class="point-label">DOVE INQUADRARE PER PRIMO STANOTTE</div>'
      +'<div class="point-name">↗ '+best.name+'</div>'
      +'<div class="point-main">Inquadra verso <b>'+compassDir(best.maxAz)+'</b> a circa <b>'+Math.round(best.maxAz)+'°</b> di azimut, <b>'+Math.round(best.maxAlt)+'°</b> sopra l\'orizzonte. '+magSpan(best.mag)+'</div>'
      + metricsBlockHTML(bestDistObj,bestMassObj)
      +'<div class="point-meta">Picco alle <b>'+fmtTime(best.maxTime)+'</b>'
      + (bestAbs?' · Culmina alle <b>'+fmtTime(bestAbs.time)+'</b> a <b>'+Math.round(bestAbs.alt)+'°</b> ('+bestQ+')':'')
      +' in <b>'+best.cons+'</b>. Setup C8: <b>'+getDynamicEyepieceAdvice(best.key,best.maxAlt,best.culmAlt)+'</b><br><a href="'+best.url+'" target="_blank" rel="noopener" style="color:var(--cyan); display:inline-block; margin-top:5px;">Apri scheda INAF per '+best.name+' ↗</a></div></div>';
  }else{
    pointerEl.innerHTML='<div class="point-card"><div class="point-label">DOVE INQUADRARE PER PRIMO STANOTTE</div><div class="point-name">Luna o Deep-Sky</div><div class="point-main">Nessun pianeta principale supera i 18° di quota stanotte.</div></div>';
  }

  var monthParts=obsDateParts(win.start);
  var curMonth=+monthParts.month-1, curDay=+monthParts.day;
  var activeShowers=SHOWERS.filter(function(s){
    if(s.s[0]===s.e[0])return curMonth===s.s[0]&&curDay>=s.s[1]&&curDay<=s.e[1];
    return (curMonth===s.s[0]&&curDay>=s.s[1])||(curMonth===s.e[0]&&curDay<=s.e[1]);
  });
  var showersEl=document.getElementById('showersText');
  if(showersEl){
    if(activeShowers.length>0)showersEl.textContent=activeShowers.map(function(s){return "• "+s.name+" (ZHR ~"+s.zhr+")";}).join(' ');
    else showersEl.textContent="Nessuno sciame di rilievo stanotte.";
  }
  updateNightScore();
  updateNavButtons();
  scheduleFitMetrics();
}
function computeNightIdxRange(hTimeArr,obs,anchorDate,dayOffsetFallback){
  if(typeof Astronomy==='undefined'||!hTimeArr||!hTimeArr.length)return [];
  try{
    var darkWin=getAstroDarkWindow(obs,anchorDate);
    if(!darkWin.start||!darkWin.end)return [];
    var duskStr=dateToIsoHourStr(darkWin.start);var dawnStr=dateToIsoHourStr(darkWin.end);
    var idxStart=-1,idxEnd=-1;
    for(var i=0;i<hTimeArr.length;i++){var t=hTimeArr[i];if(t>=duskStr&&idxStart<0)idxStart=i;if(t<=dawnStr)idxEnd=i;}
    if(idxStart<0||idxEnd<0||idxStart>idxEnd)return [];
    var out=[];for(var j=idxStart;j<=idxEnd;j++)out.push(j);
    return out;
  }catch(e){return [];}
}
