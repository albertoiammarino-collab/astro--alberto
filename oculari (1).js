"use strict";
/* Astro Alberto. Campo apparente e campo reale degli oculari (M6). I dati non disponibili sono indicati come N/D e le stime non sono presentate come certezze. */
// ====================================================== M6: campo reale per oculare
var currentMoonDiamArcmin = 31;
function loadAfov(){
  var o=null;
  try{o=JSON.parse(safeGet('astroalert_afov')||'null');}catch(err){o=null;}
  var r={};
  Object.keys(AFOV_DEFAULTS).forEach(function(k){
    var v=(o&&Object.prototype.hasOwnProperty.call(o,k))?o[k]:AFOV_DEFAULTS[k];
    r[k]=(typeof v==='number'&&isFinite(v)&&v>=20&&v<=110)?v:null;
  });
  return r;
}
function lerpAfov(f,f0,v0,f1,v1){
  if(v0===null||v1===null) return null;
  return v0+(f-f0)*(v1-v0)/(f1-f0);
}
function afovFor(fam,f,a){
  if(fam==='p25') return a.p25;
  if(fam==='p15') return a.p15;
  if(fam==='sv') return lerpAfov(f,7,a.sv7,21,a.sv21);
  if(fam==='hy') return lerpAfov(f,8,a.hy8,24,a.hy24);
  return null;
}
function eyepieceRows(){
  var a=loadAfov();
  return EP_ROWS.map(function(r){
    var mag=Math.round(2032/r.f*r.b);
    var afov=afovFor(r.fam,r.f,a);
    var fieldDeg=afov===null?null:afov/(2032/r.f*r.b);
    return {l:r.l,b:r.b,mag:mag,pupil:r.f/(10*r.b),afov:afov,fieldDeg:fieldDeg,use:r.use};
  });
}
function fmtField(deg){
  if(deg===null) return '—';
  if(deg>=1) return itn(deg,2)+'°';
  return itn(deg*60,0)+'′';
}
function renderEyepieceTable(){
  var tb=document.getElementById('eyepieceBody');
  if(!tb) return;
  tb.innerHTML=eyepieceRows().map(function(r){
    var fits=r.fieldDeg!==null && r.fieldDeg*60>=currentMoonDiamArcmin;
    return '<tr class="ep-row'+(r.b===2?' barlow-row':'')+'"><td>'+escapeHtml(r.l)+'</td><td class="num">'+r.mag+'x</td><td class="num">'+itn(r.pupil,2)+' mm</td>'
      +'<td class="num">'+fmtField(r.fieldDeg)+(fits?'<span class="ep-badge">Luna intera</span>':'')+'</td><td>'+escapeHtml(r.use)+'</td></tr>';
  }).join('');
}
function updateMoonFieldText(){
  var el=document.getElementById('moonFieldTxt');
  if(!el) return;
  var rows=eyepieceRows().filter(function(r){return r.fieldDeg!==null && r.fieldDeg*60>=currentMoonDiamArcmin;});
  if(!rows.length){ el.textContent=' Campo: nessun oculare con campo apparente noto contiene la Luna intera ('+itn(currentMoonDiamArcmin,1)+'′). Controlla i valori nella scheda Info.'; return; }
  rows.sort(function(a,b){return b.mag-a.mag;});
  var best=rows[0];
  el.textContent=' Campo: la Luna ('+itn(currentMoonDiamArcmin,1)+'′) entra intera fino a '+best.mag+'x ('+best.l+(best.b===2?' con Barlow':'')+', campo reale '+fmtField(best.fieldDeg)+'). Oltre questo ingrandimento vedi solo una parte del disco.';
}
function bindAfovInputs(){
  var keys=Object.keys(AFOV_DEFAULTS);
  function fill(){
    var a=loadAfov();
    keys.forEach(function(k){var el=document.getElementById('afov_'+k);if(el)el.value=a[k]===null?'':a[k];});
  }
  fill();
  keys.forEach(function(k){
    var el=document.getElementById('afov_'+k);
    if(!el) return;
    el.addEventListener('change',function(){
      var o={};
      keys.forEach(function(kk){var e2=document.getElementById('afov_'+kk);var v=e2&&e2.value!==''?Number(String(e2.value).replace(',','.')):null;o[kk]=(v!==null&&isFinite(v))?v:null;});
      safeSet('astroalert_afov',JSON.stringify(o));
      fill();renderEyepieceTable();updateMoonFieldText();
    });
  });
  var rb=document.getElementById('afovReset');
  if(rb) rb.addEventListener('click',function(){
    try{localStorage.removeItem('astroalert_afov');}catch(err){}
    fill();renderEyepieceTable();updateMoonFieldText();
  });
}
