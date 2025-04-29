// script.js – Smoothie‑grafiek + WebSerial + audio + sequentie + rode markers + kalibratie
if (!('serial' in navigator)) alert('WebSerial niet ondersteund – gebruik Chrome/Edge via https of localhost.');

/* ===== configuratie ===== */
let BASELINE = 0;   // dynamisch na kalibratie
let RANGE    = 120; // idem
const CALM_DURATION = 10000; // 10 s rustmeting
const SEQ_INTERVAL  = 4000;  // 4 s
const SEQ_DURATION  = 60000; // 60 s

/* ===== DOM ===== */
const connectBtn   = document.getElementById('connectButton');
const calibrateBtn = document.getElementById('btn-calibrate');
const whatsappBtn  = document.getElementById('btn-whatsapp');
const messengerBtn = document.getElementById('btn-messenger');
const teamsBtn     = document.getElementById('btn-teams');
const sequenceBtn  = document.getElementById('btn-sequence');

const audioWA    = document.getElementById('audio-whatsapp');
const audioMes   = document.getElementById('audio-messenger');
const audioTeams = document.getElementById('audio-teams');

const valueDisplay = document.getElementById('value-display');
const normDisplay  = document.getElementById('norm-display');

/* ===== Smoothie ===== */
const chart = new SmoothieChart({grid:{strokeStyle:'#ccc',fillStyle:'transparent',millisPerLine:1000,verticalSections:4},labels:{fillStyle:'#000'}});
const dataSeries   = new TimeSeries();
const markerSeries = new TimeSeries();
chart.addTimeSeries(dataSeries  ,{strokeStyle:'#5200FF',lineWidth:2});
chart.addTimeSeries(markerSeries,{strokeStyle:'#FF0000',lineWidth:2});
chart.streamTo(document.getElementById('stress-chart'),0);

function markEvent(){
  const t=Date.now();
  markerSeries.append(t,100);
  setTimeout(()=>markerSeries.append(Date.now(),null),120);
}
function playSound(audio){
  audio.currentTime=0; audio.play(); markEvent();
}

/* ===== WebSerial ===== */
let port;
function processLine(line){
  const raw=parseInt(line,10); if(isNaN(raw)) return;
  const pct=Math.min(Math.max((raw-BASELINE)/RANGE*100,0),100);
  dataSeries.append(Date.now(),pct);
  valueDisplay.textContent=raw;
  normDisplay.textContent=pct.toFixed(0)+'%';
}
async function readSerialLoop(){
  const reader=port.readable.pipeThrough(new TextDecoderStream()).getReader();
  let buf='';
  try{
    while(true){
      const {value,done}=await reader.read(); if(done) break;
      buf+=value;
      const parts=buf.split(/\r?\n/); buf=parts.pop();
      parts.forEach(l=>l.trim()&&processLine(l.trim()));
    }
  }finally{reader.releaseLock();}
}
async function connectSerial(){
  try{
    port=await navigator.serial.requestPort(); await port.open({baudRate:9600});
    connectBtn.textContent='Verbonden'; connectBtn.disabled=true; calibrateBtn.disabled=false;
    readSerialLoop();
  }catch(e){console.error('Connect‑fout',e);}
}

/* ===== Kalibratie ===== */
async function startCalibration(){
  calibrateBtn.disabled=true; // vergrendel knoppen
  const activeBtns=[whatsappBtn,messengerBtn,teamsBtn,sequenceBtn];
  activeBtns.forEach(b=>b.disabled=true);
  normDisplay.textContent='Kalibreer…'; normDisplay.style.color='#FFA500';

  const samples=[]; const start=Date.now();
  function listener(evt){ const raw=parseInt(evt.detail,10); if(!isNaN(raw)) samples.push(raw); }
  // Maak custom event vanuit processLine om ruwe waarde door te geven
  document.addEventListener('raw‑gsr',listener);

  await new Promise(res=>setTimeout(res,CALM_DURATION));
  document.removeEventListener('raw‑gsr',listener);

  if(samples.length>10){
    BASELINE=samples.reduce((a,b)=>a+b,0)/samples.length;
    RANGE=Math.max(...samples)-BASELINE;
    if(RANGE<40) RANGE=40; // minimum bereik
    normDisplay.textContent='✔'; normDisplay.style.color='#00AA00';
  }else{
    normDisplay.textContent='✖'; normDisplay.style.color='#FF0000';
  }
  setTimeout(()=>{normDisplay.style.color='';},2000);
  activeBtns.forEach(b=>b.disabled=false);
  calibrateBtn.disabled=false;
}

/* ===== Sequentie ===== */
let seqTimer=null;
function playRandomSound(){ playSound([audioWA,audioMes,audioTeams][Math.floor(Math.random()*3)]); }
function startSequence(){
  if(seqTimer){clearInterval(seqTimer);} playRandomSound();
  const end=Date.now()+SEQ_DURATION;
  seqTimer=setInterval(()=>{if(Date.now()>=end){clearInterval(seqTimer);seqTimer=null;}else playRandomSound();},SEQ_INTERVAL);
}

/* ===== Event‑listeners ===== */
connectBtn .addEventListener('click',connectSerial);
calibrateBtn.addEventListener('click',startCalibration);
whatsappBtn.addEventListener('click',()=>playSound(audioWA));
messengerBtn.addEventListener('click',()=>playSound(audioMes));
teamsBtn    .addEventListener('click',()=>playSound(audioTeams));
sequenceBtn .addEventListener('click',startSequence);

/* Emit raw values as CustomEvent so calibration can capture without altering core flow */
function emitRaw(raw){ document.dispatchEvent(new CustomEvent('raw‑gsr',{detail:raw})); }
// Wrap original processLine to also emit
const oldProcessLine=processLine;
processLine=function(line){ const raw=parseInt(line,10); if(!isNaN(raw)) emitRaw(raw); oldProcessLine(line); };