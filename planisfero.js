"use strict";
/* Astro Alberto. Planisfero: disegno, etichette, orologio. I dati non disponibili sono indicati come N/D e le stime non sono presentate come certezze. */
function starColor(sp){return SPECTRAL_COLORS[sp] || '#cad7ff';}
var planisphereSizeMode = safeGet('astroalert_star_size') === 'radius' ? 'radius' : 'mag';
var STAR_SIZE_SCALE = 0.7;
var PLANET_SIZE_BOOST = 1.10;
function starDotRadius(R, dpr, mag){
  var r;
  if (planisphereSizeMode === 'radius' && typeof R === 'number' && R > 0) {
    var lr = Math.log10(Math.max(1, R));
    r = 2.0 + ((lr - 0.30) / (2.93 - 0.30)) * 4.0;
  } else if (typeof mag === 'number') {
    r = 2.0 + ((3.4 - mag) / (3.4 + 1.46)) * 4.0;
  } else r = 2.5;
  return Math.max(2.0, Math.min(6.0, r)) * STAR_SIZE_SCALE * dpr;
}
function updatePlanisphereSizeUI(){
  var b = document.getElementById('btnPlanisphereSize');
  if (b) b.textContent = planisphereSizeMode === 'mag' ? 'PUNTO: LUMIN.' : 'PUNTO: RAGGIO';
  var row = document.getElementById('plnSizeRow');
  if (row) row.innerHTML = planisphereSizeMode === 'mag'
    ? '<b>Dimensione del puntino:</b> cresce con la luminosità apparente (magnitudine): le stelle più brillanti hanno il puntino più grande, da 1,4 a 4,2 px.'
    : '<b>Dimensione del puntino:</b> cresce con il logaritmo del raggio fisico della stella (R☉), da 1,4 a 4,2 px. Una supergigante lontana come Betelgeuse appare più grande di Sirio.';
}
function starGlowScore(mag){
  var s = (2 - mag) / 4;
  if(s < 0) s = 0;
  if(s > 1) s = 1;
  return s;
}

var planisphereTime = null;
var planisphereWindow = null;
var planisphereContextKey = '';
var planisphereItems = [];
var planisphereFrame = 0;
var planisphereCanvasReady = false;
var planisphereRedMode = false;

function planisphereKey(){return activeDate.toDateString()+'|'+loc.lat.toFixed(5)+'|'+loc.lon.toFixed(5);}
function planisphereNightWindow(obs){
  var dark=getAstroDarkWindow(obs,activeDate);
  if(dark.start&&dark.end&&dark.end.getTime()>dark.start.getTime()+5*60000){
    return {start:dark.start,end:dark.end,label:'Notte astronomica'};
  }
  var night=getNightWindow(obs,activeDate);
  if(night.start&&night.end&&night.end.getTime()>night.start.getTime()+5*60000){
    return {start:night.start,end:night.end,label:'Finestra notturna'};
  }
  return {start:addHours(obsMidnight(activeDate),20),end:addHours(obsMidnight(activeDate),30),label:'Orario di fallback'};
}
function ensurePlanisphereClock(force){
  var obs=new A.Observer(loc.lat,loc.lon,loc.elev);
  var key=planisphereKey();
  if(force||!planisphereWindow||key!==planisphereContextKey){
    planisphereWindow=planisphereNightWindow(obs);
    planisphereTime=new Date((planisphereWindow.start.getTime()+planisphereWindow.end.getTime())/2);
    planisphereContextKey=key;
  }else if(!planisphereTime){
    planisphereTime=new Date((planisphereWindow.start.getTime()+planisphereWindow.end.getTime())/2);
  }
}
function clampPlanisphereTime(){
  if(!planisphereWindow||!planisphereTime)return;
  var t=planisphereTime.getTime();
  var a=planisphereWindow.start.getTime(),b=planisphereWindow.end.getTime();
  if(t<a)planisphereTime=new Date(a);else if(t>b)planisphereTime=new Date(b);
}
function planisphereSetTimeFromSlider(v){
  ensurePlanisphereClock(false);
  var p=Math.max(0,Math.min(100,Number(v)||0))/100;
  planisphereTime=new Date(planisphereWindow.start.getTime()+(planisphereWindow.end.getTime()-planisphereWindow.start.getTime())*p);
  drawPlanisphere();
}
function planisphereSliderSync(){
  var r=document.getElementById('planisphereRange');
  if(!r||!planisphereWindow||!planisphereTime)return;
  var den=planisphereWindow.end.getTime()-planisphereWindow.start.getTime();
  var p=den>0?(planisphereTime.getTime()-planisphereWindow.start.getTime())/den:.5;
  r.value=String(Math.max(0,Math.min(100,Math.round(p*100))));
}
function planisphereTimeText(){
  if(!planisphereTime)return '--:--';
  return fmtTime(planisphereTime)+' · '+planisphereWindow.label;
}
function planisphereStarMassText(name){
  var components=PLANISPHERE_STAR_MASSES[name];
  if(!components||!components.length)return null;
  function earthMass(m){return (Math.round(m*332946/1000)*1000).toLocaleString('it-IT');}
  function solarMass(m){return String(Number(m.toFixed(3))).replace('.',',');}
  if(components.length===1){
    var one=components[0];
    return earthMass(one.mass)+' volte la Terra ('+solarMass(one.mass)+' volte il Sole'+(one.uncertain?', stima incerta':'')+')';
  }
  return components.map(function(c){
    var qualifier=c.qualifier?c.qualifier+' ':'';
    return c.label+': '+qualifier+earthMass(c.mass)+' volte la Terra ('+solarMass(c.mass)+' volte il Sole)';
  }).join('; ');
}
function simbadURL(identifier){
  return 'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=' + encodeURIComponent(identifier);
}
function planisphereDescForStar(s){
  var dbl = doubleByPln(s.name);
  if (dbl) return doubleDesc(dbl);
  var lookupName = PLANISPHERE_STAR_ALIASES[s.name] || s.name;
  var full = null;
  for (var i = 0; i < STAR_CATALOG.length; i++) {
    if (STAR_CATALOG[i].name === lookupName) { full = STAR_CATALOG[i]; break; }
  }
  var massText = planisphereStarMassText(s.name) || (full ? full.massRatio : null);
  var simbadId = PLANISPHERE_STAR_SIMBAD[s.name] || lookupName.replace(/\s+[AB]$/, '');
  return {
    kind:'star', name:s.name, ra:s.ra, dec:s.dec, mag:s.mag,
    distLy:full && typeof full.distLy === 'number' ? full.distLy : null,
    massRatio:massText || 'Dato non disponibile nel catalogo',
    url:full && full.url ? full.url : null,
    simbad:full && full.simbad ? full.simbad : simbadURL(simbadId)
  };
}

function drawSunIcon(ctx, x, y, r){
  var glow=ctx.createRadialGradient(x,y,r*0.5,x,y,r*2.6);
  glow.addColorStop(0,'rgba(255,220,80,0.55)');
  glow.addColorStop(0.4,'rgba(255,200,50,0.18)');
  glow.addColorStop(1,'rgba(255,200,50,0)');
  ctx.beginPath();ctx.arc(x,y,r*2.6,0,Math.PI*2);ctx.fillStyle=glow;ctx.fill();
  ctx.strokeStyle='#ffd633';ctx.lineWidth=Math.max(1.6,r*0.18);ctx.lineCap='round';
  for(var i=0;i<12;i++){
    var ang=i*Math.PI/6+Math.PI/12;
    var x1=x+Math.cos(ang)*r*1.15,y1=y+Math.sin(ang)*r*1.15;
    var x2=x+Math.cos(ang)*r*1.85,y2=y+Math.sin(ang)*r*1.85;
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  }
  var core=ctx.createRadialGradient(x-r*0.3,y-r*0.3,r*0.1,x,y,r);
  core.addColorStop(0,'#ffffff');core.addColorStop(0.4,'#ffe680');core.addColorStop(1,'#ffb733');
  ctx.beginPath();ctx.arc(x,y,r*0.95,0,Math.PI*2);ctx.fillStyle=core;ctx.fill();
}
function drawMoonIcon(ctx, x, y, r){
  var glow=ctx.createRadialGradient(x,y,r*0.5,x,y,r*2.4);
  glow.addColorStop(0,'rgba(240,245,255,0.55)');
  glow.addColorStop(0.35,'rgba(225,235,255,0.22)');
  glow.addColorStop(0.7,'rgba(215,225,250,0.08)');
  glow.addColorStop(1,'rgba(215,225,250,0)');
  ctx.beginPath();ctx.arc(x,y,r*2.4,0,Math.PI*2);ctx.fillStyle=glow;ctx.fill();
  var spikeLen = r * 1.9;
  var spikeW = Math.max(1.2, r*0.22);
  ctx.strokeStyle='rgba(255,255,255,0.88)';
  ctx.lineWidth=spikeW;ctx.lineCap='round';
  ctx.beginPath();
  ctx.moveTo(x, y - spikeLen); ctx.lineTo(x, y + spikeLen);
  ctx.moveTo(x - spikeLen, y); ctx.lineTo(x + spikeLen, y);
  ctx.stroke();
  var dLen = r * 1.35;var d = dLen/Math.sqrt(2);
  ctx.strokeStyle='rgba(255,255,255,0.5)';
  ctx.lineWidth=Math.max(0.9, r*0.14);
  ctx.beginPath();
  ctx.moveTo(x - d, y - d); ctx.lineTo(x + d, y + d);
  ctx.moveTo(x + d, y - d); ctx.lineTo(x - d, y + d);
  ctx.stroke();
  var body=ctx.createRadialGradient(x-r*0.35,y-r*0.35,r*0.15,x,y,r);
  body.addColorStop(0,'#ffffff');body.addColorStop(0.55,'#fafbff');body.addColorStop(1,'#d4d9e2');
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=body;ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.95)';
  ctx.lineWidth=Math.max(1.2, r*0.14);
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='rgba(140,150,170,0.4)';
  [[-0.35,-0.25,0.18],[0.15,0.1,0.14],[-0.05,0.42,0.1],[0.4,-0.35,0.11],[0.05,-0.15,0.08],[-0.4,0.35,0.09]].forEach(function(c){
    ctx.beginPath();ctx.arc(x+c[0]*r,y+c[1]*r,c[2]*r,0,Math.PI*2);ctx.fill();
  });
}
function drawSaturnIcon(ctx, x, y, r){
  ctx.save();
  ctx.translate(x,y);ctx.rotate(-0.42);
  ctx.beginPath();ctx.ellipse(0,0,r*1.75,r*0.52,0,Math.PI,Math.PI*2);
  ctx.strokeStyle='#e8d59c';ctx.lineWidth=Math.max(1.5,r*0.32);ctx.stroke();
  ctx.restore();
  var body=ctx.createRadialGradient(x-r*0.3,y-r*0.3,r*0.15,x,y,r);
  body.addColorStop(0,'#f5ebc5');body.addColorStop(1,'#c9b478');
  ctx.beginPath();ctx.arc(x,y,r*0.88,0,Math.PI*2);ctx.fillStyle=body;ctx.fill();
  ctx.save();
  ctx.translate(x,y);ctx.rotate(-0.42);
  ctx.beginPath();ctx.ellipse(0,0,r*1.75,r*0.52,0,0,Math.PI);
  ctx.strokeStyle='#e8d59c';ctx.lineWidth=Math.max(1.5,r*0.32);ctx.stroke();
  ctx.restore();
}
function drawJupiterIcon(ctx, x, y, r){
  var glow=ctx.createRadialGradient(x,y,r*0.7,x,y,r*1.4);
  glow.addColorStop(0,'rgba(245,194,97,0.35)');glow.addColorStop(1,'rgba(245,194,97,0)');
  ctx.beginPath();ctx.arc(x,y,r*1.4,0,Math.PI*2);ctx.fillStyle=glow;ctx.fill();
  ctx.save();
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();
  var base=ctx.createRadialGradient(x-r*0.3,y-r*0.3,r*0.2,x,y,r);
  base.addColorStop(0,'#f8dcae');base.addColorStop(1,'#e0a860');
  ctx.fillStyle=base;ctx.fillRect(x-r,y-r,r*2,r*2);
  ctx.fillStyle='rgba(180,110,50,0.55)';
  ctx.fillRect(x-r,y-r*0.42,r*2,r*0.2);
  ctx.fillRect(x-r,y+r*0.05,r*2,r*0.16);
  ctx.fillStyle='rgba(200,140,80,0.4)';
  ctx.fillRect(x-r,y-r*0.15,r*2,r*0.14);
  ctx.fillStyle='#c73a2e';
  ctx.beginPath();ctx.ellipse(x+r*0.32,y+r*0.15,r*0.22,r*0.14,0,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function drawMarsIcon(ctx, x, y, r){
  var glow=ctx.createRadialGradient(x,y,r*0.6,x,y,r*1.4);
  glow.addColorStop(0,'rgba(231,76,60,0.35)');glow.addColorStop(1,'rgba(231,76,60,0)');
  ctx.beginPath();ctx.arc(x,y,r*1.4,0,Math.PI*2);ctx.fillStyle=glow;ctx.fill();
  var body=ctx.createRadialGradient(x-r*0.3,y-r*0.3,r*0.15,x,y,r);
  body.addColorStop(0,'#f08060');body.addColorStop(1,'#b02a20');
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=body;ctx.fill();
  ctx.beginPath();ctx.arc(x,y-r*0.55,r*0.35,Math.PI,Math.PI*2);
  ctx.fillStyle='rgba(255,255,255,0.78)';ctx.fill();
}
function drawVenusIcon(ctx, x, y, r){
  var glow=ctx.createRadialGradient(x,y,r*0.6,x,y,r*1.6);
  glow.addColorStop(0,'rgba(255,235,180,0.55)');glow.addColorStop(1,'rgba(255,235,180,0)');
  ctx.beginPath();ctx.arc(x,y,r*1.6,0,Math.PI*2);ctx.fillStyle=glow;ctx.fill();
  var body=ctx.createRadialGradient(x-r*0.35,y-r*0.35,r*0.15,x,y,r);
  body.addColorStop(0,'#ffffff');body.addColorStop(1,'#f2d98a');
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=body;ctx.fill();
  ctx.save();
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();
  ctx.beginPath();ctx.arc(x+r*0.55,y,r*1.05,0,Math.PI*2);
  ctx.fillStyle='rgba(10,17,29,0.92)';ctx.fill();
  ctx.restore();
}
function drawMercuryIcon(ctx, x, y, r){
  var body=ctx.createRadialGradient(x-r*0.3,y-r*0.3,r*0.15,x,y,r);
  body.addColorStop(0,'#e0e0e0');body.addColorStop(1,'#909090');
  ctx.beginPath();ctx.arc(x,y,r*0.85,0,Math.PI*2);ctx.fillStyle=body;ctx.fill();
}
function drawUranusIcon(ctx, x, y, r){
  var body=ctx.createRadialGradient(x-r*0.3,y-r*0.3,r*0.15,x,y,r);
  body.addColorStop(0,'#aef0f0');body.addColorStop(1,'#4bb0b0');
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=body;ctx.fill();
}
function drawNeptuneIcon(ctx, x, y, r){
  var body=ctx.createRadialGradient(x-r*0.3,y-r*0.3,r*0.15,x,y,r);
  body.addColorStop(0,'#8fb4f5');body.addColorStop(1,'#3055c5');
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=body;ctx.fill();
}
function drawEyeIcon(ctx, cx, cy, size, color, bgColor){
  var w = size * 1.7;var h = size * 0.7;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, size * 1.05, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';ctx.fill();
  ctx.strokeStyle = color;ctx.lineWidth = Math.max(1, size * 0.07);
  ctx.lineJoin = 'round';ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - w/2, cy);
  ctx.quadraticCurveTo(cx, cy - h*1.2, cx + w/2, cy);
  ctx.quadraticCurveTo(cx, cy + h*1.2, cx - w/2, cy);
  ctx.closePath();ctx.stroke();
  var irisR = size * 0.36;
  ctx.beginPath();ctx.arc(cx, cy, irisR, 0, Math.PI*2);
  ctx.fillStyle = color;ctx.fill();
  ctx.beginPath();ctx.arc(cx, cy, irisR * 0.42, 0, Math.PI*2);
  ctx.fillStyle = '#000';ctx.fill();
  ctx.beginPath();ctx.arc(cx - irisR * 0.42, cy - irisR * 0.42, irisR * 0.22, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';ctx.fill();
  ctx.restore();
}
function drawStar(ctx, x, y, mag, sp, R, dpr){
  var rDot  = starDotRadius(R, dpr, mag);
  var glow  = starGlowScore(mag);
  var color = starColor(sp);
  if(glow > 0.05){
    var glowR = rDot * (2.2 + glow * 5.0);
    var a1 = Math.round(100 + glow * 145).toString(16).padStart(2,'0');
    var a2 = Math.round(30  + glow * 70 ).toString(16).padStart(2,'0');
    var grad = ctx.createRadialGradient(x, y, rDot*0.25, x, y, glowR);
    grad.addColorStop(0,   color + a1);
    grad.addColorStop(0.4, color + a2);
    grad.addColorStop(1,   color + '00');
    ctx.beginPath();ctx.arc(x, y, glowR, 0, Math.PI*2);
    ctx.fillStyle = grad;ctx.fill();
  }
  ctx.beginPath();ctx.arc(x, y, rDot, 0, Math.PI*2);
  ctx.fillStyle = color;ctx.fill();
  if(glow > 0.45){
    var coreAlpha = Math.min(1, 0.4 + glow * 0.6);
    ctx.beginPath();ctx.arc(x, y, rDot * 0.55, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,' + coreAlpha.toFixed(2) + ')';ctx.fill();
  }
  if(mag < 0){
    var spikeLen = rDot * (3.0 + glow * 1.8);
    var spikeW   = Math.max(0.7*dpr, rDot * 0.22);
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 + glow*0.4).toFixed(2) + ')';
    ctx.lineWidth = spikeW;ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y - spikeLen); ctx.lineTo(x, y + spikeLen);
    ctx.moveTo(x - spikeLen, y); ctx.lineTo(x + spikeLen, y);
    ctx.stroke();
  }
}

function drawPlanisphere(){
  var canvas=document.getElementById('skyCanvas');
  if(!canvas||typeof A==='undefined')return;
  ensurePlanisphereClock(false);clampPlanisphereTime();planisphereSliderSync();
  var rect=canvas.getBoundingClientRect();
  var cssSize=Math.max(280,Math.floor(Math.min(rect.width||360,rect.height||360)));
  var dpr=Math.min(window.devicePixelRatio||1,2.5);
  var px=Math.max(600,Math.min(1200,Math.round(cssSize*dpr)));
  if(canvas.width!==px||canvas.height!==px){canvas.width=px;canvas.height=px;}
  var w=canvas.width,h=canvas.height,cx=w/2,cy=h/2;
  var cardinalPad=Math.round(w*0.055);
  var R=w/2-cardinalPad;
  var css=getComputedStyle(document.body);
  var bg=css.getPropertyValue('--bg').trim()||'#070c16';
  var ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);
  ctx.fillStyle='#02050b';ctx.fill();
  ctx.strokeStyle='rgba(80,100,130,0.35)';ctx.lineWidth=Math.max(1,1.2*dpr);ctx.stroke();
  [30,60].forEach(function(alt){
    var rr=R*(1-alt/90);
    ctx.beginPath();ctx.arc(cx,cy,rr,0,Math.PI*2);
    ctx.strokeStyle='rgba(140,160,186,.13)';ctx.lineWidth=1*dpr;
    ctx.setLineDash([3*dpr,5*dpr]);ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(cx,cy-R);ctx.lineTo(cx,cy+R);
  ctx.moveTo(cx-R,cy);ctx.lineTo(cx+R,cy);
  ctx.strokeStyle='rgba(140,160,186,.1)';ctx.lineWidth=1*dpr;ctx.stroke();
  var cardFont=Math.round(w*0.034);
  ctx.font='900 '+cardFont+'px ui-monospace,monospace';
  ctx.fillStyle='#f2b84b';ctx.textAlign='center';ctx.textBaseline='middle';
  var cardOffset=Math.round(cardinalPad*0.55);
  ctx.fillText('N',cx,cy-R-cardOffset);
  ctx.fillText('S',cx,cy+R+cardOffset);
  ctx.fillText('E',cx-R-cardOffset,cy);
  ctx.fillText('O',cx+R+cardOffset,cy);
  function project(alt,az){
    var r=R*(1-alt/90);
    var th=(az-90)*Math.PI/180;
    return {x:cx-r*Math.cos(th),y:cy+r*Math.sin(th)};
  }
  var obs=new A.Observer(loc.lat,loc.lon,loc.elev);
  var muted=css.getPropertyValue('--muted').trim()||'#8ca0ba';
  drawEyeIcon(ctx,cx,cy,Math.round(w*0.020),muted,bg);
  ctx.strokeStyle='rgba(200,215,240,0.55)';
  ctx.lineWidth=Math.max(1.3*dpr,1.6);
  ctx.lineCap='round';
  var constellationLabelPts=[];
  CONSTELLATIONS.forEach(function(con){
    var visiblePts=[];
    con.lines.forEach(function(seg){
      try{
        var h1=fixedHorizon({ra:seg[0],dec:seg[1]},planisphereTime,obs);
        var h2=fixedHorizon({ra:seg[2],dec:seg[3]},planisphereTime,obs);
        if(h1.altitude>-3 && h2.altitude>-3){
          var p1=project(h1.altitude,h1.azimuth);
          var p2=project(h2.altitude,h2.azimuth);
          ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();
          if(h1.altitude>0)visiblePts.push(p1);
          if(h2.altitude>0)visiblePts.push(p2);
        }
      }catch(e){}
    });
    if(visiblePts.length>=3){
      var sx=0,sy=0;
      visiblePts.forEach(function(p){sx+=p.x;sy+=p.y;});
      constellationLabelPts.push({name:con.name,x:sx/visiblePts.length,y:sy/visiblePts.length});
    }
  });
  var items=[];
  Object.keys(PLANET_DATA).forEach(function(k){
    try{
      var eq=A.Equator(A.Body[k],planisphereTime,obs,true,true);
      var hor=A.Horizon(planisphereTime,obs,eq.ra,eq.dec,'normal');
      var ill=A.Illumination(A.Body[k],planisphereTime);
      if(hor.altitude>0){
        var p=project(hor.altitude,hor.azimuth);
        items.push({type:'planet',key:k,name:PLANET_DATA[k].name,x:p.x,y:p.y,alt:hor.altitude,az:hor.azimuth,mag:ill.mag,desc:resolveTarget(k),priority:2});
      }
    }catch(e){}
  });
  try{
    var eqM=A.Equator(A.Body.Moon,planisphereTime,obs,true,true);
    var horM=A.Horizon(planisphereTime,obs,eqM.ra,eqM.dec,'normal');
    var illM=A.Illumination(A.Body.Moon,planisphereTime);
    if(horM.altitude>0){
      var pM=project(horM.altitude,horM.azimuth);
      items.push({type:'moon',name:'Luna',x:pM.x,y:pM.y,alt:horM.altitude,az:horM.azimuth,mag:illM.mag,desc:resolveTarget('Moon'),priority:0});
    }
  }catch(e){}
  try{
    var eqS=A.Equator(A.Body.Sun,planisphereTime,obs,true,true);
    var horS=A.Horizon(planisphereTime,obs,eqS.ra,eqS.dec,'normal');
    var illS=A.Illumination(A.Body.Sun,planisphereTime);
    if(horS.altitude>0){
      var pS=project(horS.altitude,horS.azimuth);
      items.push({type:'sun',name:'Sole',x:pS.x,y:pS.y,alt:horS.altitude,az:horS.azimuth,mag:illS.mag,desc:resolveTarget('Sun'),priority:0});
    }
  }catch(e){}
  PLANISPHERE_STARS.forEach(function(s){
    try{
      var hor=fixedHorizon({ra:s.ra,dec:s.dec},planisphereTime,obs);
      if(hor.altitude>0){
        var p=project(hor.altitude,hor.azimuth);
        items.push({
          type:'star', name:s.name, x:p.x, y:p.y,
          alt:hor.altitude, az:hor.azimuth,
          mag:s.mag, sp:s.sp, R:s.R, label:s.label === true, dbl:!!doubleByPln(s.name),
          con: CON_OF[s.name] || null,
          desc:planisphereDescForStar(s),
          priority:10+s.mag
        });
      }
    }catch(e){}
  });
  var crowdedConstellations = {};
  var keepStarSet = {};
  CONSTELLATIONS.forEach(function(con){
    var conStars = [];
    items.forEach(function(it){
      if(it.type==='star' && it.con === con.name) conStars.push(it);
    });
    if(conStars.length < 4) return;
    var minD = Infinity;
    for(var i=0;i<conStars.length;i++){
      for(var j=i+1;j<conStars.length;j++){
        var dx=conStars[i].x-conStars[j].x;
        var dy=conStars[i].y-conStars[j].y;
        var d=Math.sqrt(dx*dx+dy*dy);
        if(d<minD) minD=d;
      }
    }
    var crowdingThreshold = w * 0.055;
    if(minD < crowdingThreshold){
      crowdedConstellations[con.name] = true;
      conStars.sort(function(a,b){
        if(a.mag !== b.mag) return a.mag - b.mag;
        return b.R - a.R;
      });
      conStars.slice(0,3).forEach(function(s){ keepStarSet[s.name] = true; });
    }
  });
  items.forEach(function(it){
    if(it.type==='star'){
      if(it.con && crowdedConstellations[it.con] && !keepStarSet[it.name]) return;
      drawStar(ctx, it.x, it.y, it.mag, it.sp, it.R, dpr);
      if(it.dbl){
        ctx.beginPath();ctx.arc(it.x, it.y, starDotRadius(it.R, dpr, it.mag) + 3.2*dpr, 0, Math.PI*2);
        ctx.strokeStyle='rgba(224,140,255,0.85)';ctx.lineWidth=Math.max(1,1.1*dpr);ctx.stroke();
      }
    }
  });
  var iconR=R*0.024;
  var PLANET_ICON_SCALE=1.34*PLANET_SIZE_BOOST;
  var PLANET_ICON_MIN_SCALE=1.00*PLANET_SIZE_BOOST;
  var planetFootprint={Mercury:1.0,Venus:1.65,Mars:1.45,Jupiter:1.70,Saturn:2.02,Uranus:1.08,Neptune:1.08};
  var planetItems=items.filter(function(it){return it.type==='planet';});
  planetItems.forEach(function(it){it.iconScale=PLANET_ICON_SCALE;});
  var planetGap=2.4*dpr;
  for(var pi=0;pi<planetItems.length;pi++){
    for(var pj=pi+1;pj<planetItems.length;pj++){
      var pa=planetItems[pi],pb=planetItems[pj];
      var pd=Math.hypot(pa.x-pb.x,pa.y-pb.y);
      var pSum=iconR*0.95*(planetFootprint[pa.key]||1.2)*pa.iconScale
             +iconR*0.95*(planetFootprint[pb.key]||1.2)*pb.iconScale;
      if(pd<pSum+planetGap){
        var fitScale=(pd-planetGap)/(iconR*0.95*((planetFootprint[pa.key]||1.2)+(planetFootprint[pb.key]||1.2)));
        fitScale=Math.max(PLANET_ICON_MIN_SCALE,Math.min(PLANET_ICON_SCALE,fitScale));
        pa.iconScale=Math.min(pa.iconScale,fitScale);
        pb.iconScale=Math.min(pb.iconScale,fitScale);
      }
    }
  }
  items.forEach(function(it){
    if(it.type==='planet'){
      var r=iconR*0.95*(it.iconScale||PLANET_ICON_SCALE);
      switch(it.key){
        case 'Mercury': drawMercuryIcon(ctx,it.x,it.y,r);break;
        case 'Venus':   drawVenusIcon(ctx,it.x,it.y,r);break;
        case 'Mars':    drawMarsIcon(ctx,it.x,it.y,r);break;
        case 'Jupiter': drawJupiterIcon(ctx,it.x,it.y,r*1.18);break;
        case 'Saturn':  drawSaturnIcon(ctx,it.x,it.y,r*1.12);break;
        case 'Uranus':  drawUranusIcon(ctx,it.x,it.y,r);break;
        case 'Neptune': drawNeptuneIcon(ctx,it.x,it.y,r);break;
      }
    }
  });
  items.forEach(function(it){
    if(it.type==='moon') drawMoonIcon(ctx,it.x,it.y,iconR*1.38);
    if(it.type==='sun')  drawSunIcon(ctx,it.x,it.y,iconR*1.32);
  });
  items.sort(function(a,b){return a.priority-b.priority;});
  var occupied=[];
  items.forEach(function(it){
    if(it.type==='star' && it.con && crowdedConstellations[it.con] && !keepStarSet[it.name]) return;
    var blocker;
    if(it.type==='sun') blocker={x1:it.x-iconR*2.4,y1:it.y-iconR*2.4,x2:it.x+iconR*2.4,y2:it.y+iconR*2.4};
    else if(it.type==='moon') blocker={x1:it.x-iconR*1.9,y1:it.y-iconR*1.9,x2:it.x+iconR*1.9,y2:it.y+iconR*1.9};
    else if(it.type==='planet'){
      var pHalf=iconR*0.95*(it.iconScale||PLANET_ICON_SCALE)*(planetFootprint[it.key]||1.2)+2*dpr;
      blocker={x1:it.x-pHalf,y1:it.y-pHalf,x2:it.x+pHalf,y2:it.y+pHalf};
    }
    else {
      var sr = starDotRadius(it.R, dpr, it.mag) + (it.mag < 0 ? 9*dpr : (it.dbl ? 6.5*dpr : 3*dpr));
      blocker={x1:it.x-sr,y1:it.y-sr,x2:it.x+sr,y2:it.y+sr};
    }
    occupied.push(blocker);
  });
  var centerRes=Math.round(w*0.042);
  occupied.push({x1:cx-centerRes,y1:cy-centerRes,x2:cx+centerRes,y2:cy+centerRes});
  function overlaps(a,b){return !(a.x2<b.x1||a.x1>b.x2||a.y2<b.y1||a.y1>b.y2);}
  var placedLabelBoxes=[], placedLeaders=[];
  function segHitsBox(sg,b){
    var x0=sg[0],y0=sg[1],dx=sg[2]-sg[0],dy=sg[3]-sg[1],t0=0,t1=1;
    var p=[-dx,dx,-dy,dy], q=[x0-b.x1,b.x2-x0,y0-b.y1,b.y2-y0];
    for(var i=0;i<4;i++){
      if(p[i]===0){ if(q[i]<0) return false; }
      else { var r=q[i]/p[i]; if(p[i]<0){ if(r>t1) return false; if(r>t0) t0=r; } else { if(r<t0) return false; if(r<t1) t1=r; } }
    }
    return true;
  }
  function leaderConflicts(ax,ay,tx,ty,box,drawsLeader){
    var n=0, i;
    if(drawsLeader){ var sg=[ax,ay,tx,ty]; for(i=0;i<placedLabelBoxes.length;i++) if(segHitsBox(sg,placedLabelBoxes[i])) n++; }
    for(i=0;i<placedLeaders.length;i++) if(segHitsBox(placedLeaders[i],box)) n++;
    return n;
  }
  var angles=[0,30,60,90,120,150,180,210,240,270,300,330,15,45,75,105,135,165,195,225,255,285,315,345];
  var distMults=[1.6,2.4,3.4,4.6,6.0,8.0,10.5];
  var fontScalePlanet=[1.0,0.85,0.72,0.58];
  var fontScaleStar  =[0.9,0.75,0.62,0.52];
  var fontBase=Math.max(7*dpr,w*0.020);
  var labelItems=items.filter(function(it){
    if(it.type==='star'){
      if(!it.label) return false;
      if(it.con && crowdedConstellations[it.con] && !keepStarSet[it.name]) return false;
    }
    return true;
  }).sort(function(a,b){
    var pa = (a.type==='star')?100+a.mag:a.priority;
    var pb = (b.type==='star')?100+b.mag:b.priority;
    return pa-pb;
  });
  labelItems.forEach(function(it){
    var baseFont = (it.type==='star') ? fontBase*0.9 : fontBase*1.05;
    var mults = (it.type==='star') ? fontScaleStar : fontScalePlanet;
    var anchorPad;
    if(it.type==='planet') anchorPad=iconR*0.95*(it.iconScale||PLANET_ICON_SCALE)*(planetFootprint[it.key]||1.2)+2*dpr;
    else if(it.type==='moon') anchorPad=iconR*2.2;
    else if(it.type==='sun') anchorPad=iconR*2.0;
    else anchorPad=starDotRadius(it.R, dpr, it.mag) + (it.dbl ? 6.5*dpr : 3*dpr);
    var chosen=null;var bestScore=Infinity;
    for(var fi=0; fi<mults.length; fi++){
      var fsize=Math.max(6*dpr, baseFont*mults[fi]);
      ctx.font='700 '+fsize+'px sans-serif';
      var tw=ctx.measureText(it.name).width;
      var th=fsize*1.15;
      for(var di=0; di<distMults.length; di++){
        var dist=anchorPad+iconR*distMults[di];
        for(var ai=0; ai<angles.length; ai++){
          var rad=angles[ai]*Math.PI/180;
          var tx=it.x+Math.cos(rad)*dist;
          var ty=it.y+Math.sin(rad)*dist;
          var box={x1:tx-tw/2-5,y1:ty-th/2-5,x2:tx+tw/2+5,y2:ty+th/2+5};
          if(box.x1<2 || box.y1<2 || box.x2>w-2 || box.y2>h-2) continue;
          var dco=Math.hypot(tx-cx,ty-cy);
          if(dco+Math.max(tw,th)/2 > R+cardinalPad*0.5) continue;
          var score=0;
          for(var oi=0; oi<occupied.length; oi++){ if(overlaps(box,occupied[oi])) score+=200; }
          score += 200*leaderConflicts(it.x,it.y,tx,ty,box,Math.hypot(tx-it.x,ty-it.y)>iconR*2.5);
          score += (di*8) + (ai*0.1);score += (fi*30);
          if(score<bestScore){bestScore=score;chosen={box:box,x:tx,y:ty,fsize:fsize};}
        }
      }
      if(bestScore<50)break;
    }
    if(chosen && bestScore>=200) chosen=null;
    if(!chosen){
      if(it.type==='star') return;
      var fsize=Math.max(6*dpr, baseFont*0.55);
      ctx.font='700 '+fsize+'px sans-serif';
      var tw=ctx.measureText(it.name).width;
      var th=fsize*1.15;
      var dist=anchorPad+iconR*1.6;
      var tx=it.x+Math.cos(0)*dist, ty=it.y+Math.sin(0)*dist;
      var box={x1:tx-tw/2-5,y1:ty-th/2-5,x2:tx+tw/2+5,y2:ty+th/2+5};
      var localScore=0;
      for(var oi=0; oi<occupied.length; oi++){ if(overlaps(box,occupied[oi])) localScore+=200; }
      localScore += 200*leaderConflicts(it.x,it.y,tx,ty,box,Math.hypot(tx-it.x,ty-it.y)>iconR*2.5);
      if(localScore<200){chosen={box:box,x:tx,y:ty,fsize:fsize};}
      else {return;}
    }
    if(it.type === 'star' && bestScore >= 200) return;
    occupied.push(chosen.box);
    placedLabelBoxes.push(chosen.box);
    var anchorDist=Math.hypot(chosen.x-it.x, chosen.y-it.y);
    if(anchorDist > iconR*2.5){
      placedLeaders.push([it.x,it.y,chosen.x,chosen.y]);
      ctx.beginPath();ctx.moveTo(it.x,it.y);ctx.lineTo(chosen.x,chosen.y);
      ctx.strokeStyle='rgba(180,200,225,0.32)';ctx.lineWidth=1*dpr;ctx.stroke();
    }
    ctx.font='700 '+chosen.fsize+'px sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';
    var fill='#e7edf6';
    if(it.type==='star') fill=starColor(it.sp);
    else if(it.key==='Mars') fill='#ff9070';
    else if(it.key==='Jupiter') fill='#f5c261';
    else if(it.key==='Saturn') fill='#e8d59c';
    else if(it.key==='Uranus') fill='#aef0f0';
    else if(it.key==='Neptune') fill='#8fb4f5';
    else if(it.type==='moon'||it.type==='sun'||it.key==='Venus') fill='#fff2cc';
    else fill='#e7edf6';
    ctx.shadowColor='rgba(7,12,22,0.95)';
    ctx.shadowBlur=Math.max(3*dpr, chosen.fsize*0.28);
    ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
    ctx.fillStyle=fill;
    ctx.fillText(it.name,chosen.x,chosen.y);
    ctx.shadowBlur=0;
  });
  constellationLabelPts.forEach(function(cp){
    var baseFont=Math.max(10*dpr,w*0.017);
    var chosen=null, bestScore=Infinity;
    var cAngles=[0,30,60,90,120,150,180,210,240,270,300,330];
    var cDists=[0, 14*dpr, 26*dpr, 40*dpr, 56*dpr, 74*dpr];
    var cScales=[1.0, 0.88, 0.78, 0.68];
    for(var fi=0; fi<cScales.length; fi++){
      var fsize=Math.max(9*dpr, baseFont*cScales[fi]);
      ctx.font='800 italic '+fsize+'px Georgia,serif';
      var tw=ctx.measureText(cp.name).width;
      var th=fsize*1.25;
      for(var di=0;di<cDists.length;di++){
        for(var ai=0;ai<cAngles.length;ai++){
          var rad=cAngles[ai]*Math.PI/180;
          var tx=cp.x+Math.cos(rad)*cDists[di];
          var ty=cp.y+Math.sin(rad)*cDists[di];
          var box={x1:tx-tw/2-6,y1:ty-th/2-6,x2:tx+tw/2+6,y2:ty+th/2+6};
          if(box.x1<2||box.y1<2||box.x2>w-2||box.y2>h-2) continue;
          var dco=Math.hypot(tx-cx,ty-cy);
          if(dco+Math.max(tw,th)/2 > R-2) continue;
          var score=0;
          for(var oi=0;oi<occupied.length;oi++){ if(overlaps(box,occupied[oi])) score+=200; }
          for(var lk=0;lk<placedLeaders.length;lk++){ if(segHitsBox(placedLeaders[lk],box)) score+=200; }
          score += cDists[di]/dpr*0.2 + fi*25;
          if(score<bestScore){bestScore=score;chosen={x:tx,y:ty,box:box,fsize:fsize};}
        }
      }
      if(bestScore<50)break;
    }
    if(!chosen || bestScore>=200) return;
    occupied.push(chosen.box);
    placedLabelBoxes.push(chosen.box);
    ctx.font='800 italic '+chosen.fsize+'px Georgia,serif';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.shadowColor='rgba(7,12,22,0.98)';
    ctx.shadowBlur=Math.max(4*dpr, chosen.fsize*0.32);
    ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
    ctx.fillStyle='rgba(200,225,255,0.95)';
    ctx.fillText(cp.name,chosen.x,chosen.y);
    ctx.shadowBlur=0;
  });
  planisphereItems=items;
  var tl=document.getElementById('planisphereTimeLabel');if(tl)tl.textContent=planisphereTimeText();
  var note=document.getElementById('planisphereNote');
  if(note){
    var o=getSunState(obs,planisphereTime);
    var night=o.isNight?'Notte astronomica':o.isAstronomicalTwilight?'Crepuscolo astronomico':o.isNauticalTwilight?'Crepuscolo nautico':o.isCivilTwilight?'Crepuscolo civile':o.isDay?'Giorno':'Sole sotto l\'orizzonte';
    note.textContent=night+' · '+items.length+' oggetti sopra l\'orizzonte · anello viola = stella doppia · pianeti calcolati per data/ora selezionate, stelle dal catalogo J2000';
  }
  planisphereCanvasReady=true;
}

function setRedMode(on){
  planisphereRedMode = !!on;
  document.body.classList.toggle('red-mode', planisphereRedMode);
  safeSet('astroalert_red_mode', planisphereRedMode ? '1' : '0');
  var btn = document.getElementById('btnRedMode');
  if(btn){
    btn.classList.toggle('active', planisphereRedMode);
    btn.setAttribute('aria-pressed', planisphereRedMode ? 'true' : 'false');
  }
  drawPlanisphere();
}

function switchTab(tabName){
  document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.tab === tabName); });
  if (tabName === 'sky') requestWakeLock(); else if (!document.getElementById('arRoot')) releaseWakeLock();
  document.querySelectorAll('.tab-panel').forEach(function(p){ p.classList.toggle('active', p.dataset.tab === tabName); });
  try { window.scrollTo({top: 0, behavior: 'smooth'}); } catch(e){ window.scrollTo(0,0); }
  if(tabName === 'sky'){
    setTimeout(function(){ try{ drawPlanisphere(); }catch(e){} }, 80);
  }
  try{ applyFilterToTargets(activeFilter); }catch(e){}
}
function switchSolarSeg(segName){
  document.querySelectorAll('#solarSeg button').forEach(function(b){ b.classList.toggle('active', b.dataset.seg === segName); });
  document.querySelectorAll('.seg-panel').forEach(function(p){ p.classList.toggle('active', p.dataset.segContent === segName); });
}

function initPlanisphere(){
  var canvas=document.getElementById('skyCanvas');
  if(!canvas)return;
  if(safeGet('astroalert_red_mode') === '1') setRedMode(true);
  var btnRed = document.getElementById('btnRedMode');
  if(btnRed) btnRed.addEventListener('click', function(){
    setRedMode(!planisphereRedMode);
    toast(planisphereRedMode ? '🔴 Luce rossa attivata' : 'Luce bianca normale', 2200);
  });
  var range=document.getElementById('planisphereRange');
  var nowBtn=document.getElementById('btnPlanisphereNow');
  var nightBtn=document.getElementById('btnPlanisphereNight');
  var sizeBtn=document.getElementById('btnPlanisphereSize');
  if(sizeBtn)sizeBtn.addEventListener('click',function(){
    planisphereSizeMode=planisphereSizeMode==='mag'?'radius':'mag';
    safeSet('astroalert_star_size',planisphereSizeMode);
    updatePlanisphereSizeUI();drawPlanisphere();
  });
  updatePlanisphereSizeUI();
  if(range)range.addEventListener('input',function(){planisphereSetTimeFromSlider(this.value);});
  if(nowBtn)nowBtn.addEventListener('click',function(){
    planisphereTime=new Date();
    planisphereWindow={start:addHours(planisphereTime,-6),end:addHours(planisphereTime,6),label:'Ora attuale'};
    planisphereContextKey=planisphereKey();
    planisphereSliderSync();
    drawPlanisphere();
  });
  if(nightBtn)nightBtn.addEventListener('click',function(){ensurePlanisphereClock(true);drawPlanisphere();});
  canvas.addEventListener('click',function(e){
    if(!planisphereCanvasReady)return;
    var rect=canvas.getBoundingClientRect();
    var sx=canvas.width/rect.width,sy=canvas.height/rect.height;
    var px=(e.clientX-rect.left)*sx,py=(e.clientY-rect.top)*sy;
    var hit=null,best=Infinity;
    planisphereItems.forEach(function(it){
      var d=Math.hypot(px-it.x,py-it.y);
      var baseLimit;
      if(it.type==='moon') baseLimit=34;
      else if(it.type==='sun') baseLimit=34;
      else if(it.type==='planet') baseLimit=28;
      else baseLimit=26;
      var lim=baseLimit*sx;
      if(d<lim&&d<best){best=d;hit=it;}
    });
    var info=document.getElementById('planisphereInfo');
    if(!info)return;
    if(!hit){info.innerHTML='Tocca un oggetto per vedere altezza, azimut e magnitudine all\'ora selezionata.';return;}
    var mass='';
    if(hit.desc&&typeof hit.desc.massRatio==='string'&&hit.desc.massRatio){
      var massParts=hit.desc.kind==='star'&&hit.desc.massRatio.indexOf(';')>=0
        ? hit.desc.massRatio.split(/\s*;\s*/).filter(Boolean)
        : [hit.desc.massRatio];
      if(hit.desc.kind==='star'&&massParts.length>1){
        mass='<div class="pi-mass-group"><div class="pi-mass-title">Massa stella doppia/multipla:</div>'+massParts.map(function(part){return '<div class="pi-mass-component">'+escapeHtml(part.trim())+'</div>';}).join('')+'</div>';
      } else {
        mass='<div class="pi-mass-single"><b>Massa:</b> '+escapeHtml(hit.desc.massRatio)+'</div>';
      }
    }
    var spInfo = hit.sp ? ' · Classe <b>'+escapeHtml(hit.sp)+'</b>' : '';
    var rInfo = hit.R ? ' · R☉ <b>'+escapeHtml(hit.R)+'</b>' : '';
    var distanceText = 'N/D';
    try {
      if (hit.desc && hit.desc.body) {
        var bodyIllumination = A.Illumination(hit.desc.body, planisphereTime);
        distanceText = formatDistanceLines(bodyIllumination.geo_dist * KM_PER_AU, false).value;
      } else if (hit.desc && typeof hit.desc.distLy === 'number') {
        distanceText = formatDistanceLines(0, true, hit.desc.distLy).value;
      }
    } catch (err) { distanceText = 'N/D'; }
    var displayedMass = mass || '<div class="pi-mass-single"><b>Massa:</b> N/D nel catalogo</div>';
    var sourceLinks = '';
    if (hit.desc && hit.desc.url) sourceLinks += '<a href="'+escapeHtml(hit.desc.url)+'" target="_blank" rel="noopener">Scheda ↗</a>';
    if (hit.desc && hit.desc.simbad) sourceLinks += '<a href="'+escapeHtml(hit.desc.simbad)+'" target="_blank" rel="noopener">SIMBAD ↗</a>';
    info.innerHTML = '<div class="pi-main">'+escapeHtml(hit.name)+'</div>'
      + 'Alt <b>'+hit.alt.toFixed(1)+'°</b> · Az <b>'+Math.round(hit.az)+'° ('+compassDir(hit.az)+')</b> · Mag <b>'+Number(hit.mag).toFixed(2)+'</b>'
      + spInfo + rInfo + '<div class="pi-mass-single"><b>Distanza:</b> '+escapeHtml(distanceText)+'</div>'
      + displayedMass + '<div class="astrolinks">'+sourceLinks+'</div>'
      + '<button type="button" class="btn-ui" id="planisphereOpenCard" style="margin-top:7px;min-height:34px;padding:6px 9px;background:var(--panel-2);border:1px solid var(--line);color:var(--cyan);border-radius:6px;font-family:var(--mono);font-size:var(--fs-xs);">Apri scheda completa</button>';
    var b = document.getElementById('planisphereOpenCard');
    if (b) b.addEventListener('click', function(){ openCelestialModal(hit.desc, planisphereTime); });
  });
  window.addEventListener('resize',function(){if(planisphereFrame)cancelAnimationFrame(planisphereFrame);planisphereFrame=requestAnimationFrame(function(){planisphereFrame=0;drawPlanisphere();});});
  drawPlanisphere();
}
