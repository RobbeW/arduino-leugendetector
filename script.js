// Auteur: Robbe Wulgaert / aiindeklas.be
// Copyright 2025 - Gebruik vrij voor educatie


if (!('serial' in navigator)) {
  alert('WebSerial niet ondersteund – gebruik Chrome/Edge via https of localhost.');
}

/* ===== Configuratie ===== */
let BASELINE = 0;            // Dynamisch na kalibratie
let RANGE    = 120;          // Dynamisch, minimum enforced
const CALM_DURATION = 10000; // 10 s rustmeting
const SEQ_INTERVAL  = 4000;  // 4 s
const SEQ_DURATION  = 60000; // 60 s

/* ===== DOM ===== */
const connectBtn    = document.getElementById('connectButton');
const calibrateBtn  = document.getElementById('btn-calibrate');
const whatsappBtn   = document.getElementById('btn-whatsapp');
const messengerBtn  = document.getElementById('btn-messenger');
const teamsBtn      = document.getElementById('btn-teams');
const sequenceBtn   = document.getElementById('btn-sequence');

const audioWA       = document.getElementById('audio-whatsapp');
const audioMes      = document.getElementById('audio-messenger');
const audioTeams    = document.getElementById('audio-teams');

const valueDisplay  = document.getElementById('value-display');
const normDisplay   = document.getElementById('norm-display');

// Help-overlay elementen
const helpBtn       = document.getElementById('btn-help');
const helpOverlay   = document.getElementById('overlay-help');
const helpCloseBtn  = document.getElementById('btn-close-help');

// Statusbadge
const statusBadge   = document.getElementById('status-badge');

// Seriële poort (LET OP: boven alle functies gedefinieerd om TDZ te vermijden)
let port;

/* ===== Smoothie (grafiek) ===== */
// Opmerking: minValue/maxValue fixeren de schaal op 0–100 %
const chart = new SmoothieChart({
  grid: { strokeStyle:'#ccc', fillStyle:'transparent', millisPerLine:1000, verticalSections:4 },
  labels: { fillStyle:'#000' },
  minValue: 0,
  maxValue: 100
});
const dataSeries   = new TimeSeries();
const markerSeries = new TimeSeries();
chart.addTimeSeries(dataSeries  , { strokeStyle:'#5200FF', lineWidth:2 });
chart.addTimeSeries(markerSeries, { strokeStyle:'#FF0000', lineWidth:2 });
chart.streamTo(document.getElementById('stress-chart'), 0);

const THEME_KEY = 'stressmeter-theme';
const themeBtn  = document.getElementById('btn-theme');

// Pas grafiekkleuren aan het thema aan (labels + raster)
function applyChartTheme(isDark){
  try{
    chart.options.labels.fillStyle = isDark ? getComputedStyle(document.documentElement).getPropertyValue('--label').trim() : '#000';
    chart.options.grid.strokeStyle  = getComputedStyle(document.documentElement).getPropertyValue('--grid').trim();
    // NB: dataSeries kleuren laat ik paars/rood zoals ingesteld (merkconsistent)
    console.log('🎨 (Thema) Grafiekstijl bijgewerkt voor', isDark ? 'donker' : 'licht');
  }catch(e){
    console.log('ℹ️ (Thema) Grafiek kon nog niet worden gestyled (mogelijk nog niet gecreëerd).');
  }
}

// Bepaal startthema: lokale keuze > systeemvoorkeur
function getInitialTheme(){
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

function setTheme(theme){
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark', isDark);
  localStorage.setItem(THEME_KEY, theme);
  if (themeBtn){
    themeBtn.setAttribute('aria-pressed', String(isDark));
    themeBtn.textContent = isDark ? '☀️' : '🌙';
  }
  applyChartTheme(isDark);
  console.log('🌓 (Thema) Ingesteld op:', theme);
}

// Init thema bij laden
setTheme(getInitialTheme());

// Toggle via knop
themeBtn?.addEventListener('click', ()=>{
  const next = document.body.classList.contains('dark') ? 'light' : 'dark';
  setTheme(next);
});

// Als systeemthema live wijzigt
try{
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e)=>{
    const saved = localStorage.getItem(THEME_KEY);
    if (!saved){ setTheme(e.matches ? 'dark':'light'); }
  });
}catch{}  // oudere browsers

/* ===== Help-overlay open/close ===== */
function openHelp(){
  helpOverlay.classList.remove('hidden');
  console.log('🔎 (Info) Help-overlay geopend.');
  const titleEl = document.getElementById('help-title');
  if (titleEl && titleEl.focus) titleEl.focus();
}
function closeHelp(){
  helpOverlay.classList.add('hidden');
  console.log('🔎 (Info) Help-overlay gesloten.');
  helpBtn?.focus();
}
helpBtn?.addEventListener('click', openHelp);
helpCloseBtn?.addEventListener('click', closeHelp);
document.addEventListener('keydown', (e)=>{
  if(e.key==='Escape' && !helpOverlay.classList.contains('hidden')) closeHelp();
});
helpOverlay?.addEventListener('click', (e)=>{
  if(e.target===helpOverlay) closeHelp(); // klik buiten de kaart
});

/* ===== Statusbadge helpers ===== */
function setStatus(connected){
  if(!statusBadge) return;
  if(connected){
    statusBadge.textContent = 'Verbonden';
    statusBadge.classList.remove('status-off');
    statusBadge.classList.add('status-on');
  } else {
    statusBadge.textContent = 'Niet verbonden';
    statusBadge.classList.remove('status-on');
    statusBadge.classList.add('status-off');
  }
}
// Init: niet verbonden
setStatus(false);

/* ===== Markers en audio ===== */
function markEvent(){
  const t = Date.now();
  markerSeries.append(t, 100);
  // Kort pulsje, daarna 'null' om de lijn niet door te trekken
  setTimeout(()=> markerSeries.append(Date.now(), null), 120);
}
function playSound(audio){
  try{
    audio.currentTime = 0;
    const p = audio.play();
    if (p && typeof p.catch === 'function'){
      p.catch(()=> console.log('🔇 (Audio) Afspelen geblokkeerd door browserbeleid.'));
    }
  } catch {
    console.log('🔇 (Audio) Afspelen niet gelukt.');
  }
  markEvent();
}

/* ===== WebSerial dataverwerking ===== */
// Helper: verwerk een ruwe ADC-waarde → normaliseren en tekenen
function handleRaw(raw){
  if (isNaN(raw)) return;
  const pct = Math.min(Math.max(((raw - BASELINE) / RANGE) * 100, 0), 100);
  dataSeries.append(Date.now(), pct);
  valueDisplay.textContent = raw;
  normDisplay.textContent  = pct.toFixed(0) + '%';
}

// CustomEvent zenden zodat kalibratie passief kan meeluisteren
function emitRaw(raw){
  document.dispatchEvent(new CustomEvent('raw-gsr', { detail: raw })); // ASCII koppelteken
}

async function readSerialLoop(){
  const reader = port.readable.pipeThrough(new TextDecoderStream()).getReader();
  let buf = '';
  try{
    while(true){
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      const parts = buf.split(/\r?\n/);
      buf = parts.pop();
      parts.forEach(l=>{
        const s = l.trim();
        if(!s) return;
        const raw = parseInt(s, 10);
        if(!isNaN(raw)){
          emitRaw(raw);
          handleRaw(raw);
        }
      });
    }
  } finally {
    reader.releaseLock();
  }
}

/* ===== Verbinden (één definitie, geen duplicaat) ===== */
async function connectSerial(){
  try{
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });

    connectBtn.textContent = 'Verbonden';
    connectBtn.disabled = true;
    calibrateBtn.disabled = false;
    setStatus(true); // ✅ badge bijwerken

    // Luister naar disconnect-gebeurtenis
    navigator.serial.addEventListener('disconnect', ()=>{
      console.warn('📴 (Serieel) Verbinding verbroken.');
      setStatus(false);
      connectBtn.textContent = 'Verbind met microcontroller';
      connectBtn.disabled = false;
    });

    readSerialLoop();
  } catch(e){
    console.error('Connect-fout', e);
    setStatus(false);
  }
}

/* ===== Automatische herverbinding (optioneel, handig in klas) ===== */
(async function tryAutoConnect(){
  try{
    const ports = await navigator.serial.getPorts();
    if (ports && ports.length){
      port = ports[0];
      await port.open({ baudRate: 9600 });
      connectBtn.textContent = 'Verbonden';
      connectBtn.disabled = true;
      calibrateBtn.disabled = false;
      setStatus(true);
      readSerialLoop();
      console.log('🔌 (Serieel) Automatisch verbonden met eerder toegestane poort.');
    }
  } catch(err){
    console.log('ℹ️ (Serieel) Geen vooraf toegestane poorten of auto-verbinding mislukt.');
  }
})();

/* ===== Kalibratie ===== */
async function startCalibration(){
  // Knoppen tijdelijk vergrendelen
  calibrateBtn.disabled = true;
  const activeBtns = [whatsappBtn, messengerBtn, teamsBtn, sequenceBtn];
  activeBtns.forEach(b=> b.disabled = true);

  normDisplay.textContent = 'Kalibreer…';
  normDisplay.style.color = '#FFA500';

  const samples = [];
  function listener(evt){
    const raw = parseInt(evt.detail, 10);
    if(!isNaN(raw)) samples.push(raw);
  }
  // Luisteren naar ASCII eventnaam
  document.addEventListener('raw-gsr', listener);

  await new Promise(res=> setTimeout(res, CALM_DURATION));
  document.removeEventListener('raw-gsr', listener);

  if (samples.length > 10){
    BASELINE = samples.reduce((a,b)=> a+b, 0) / samples.length;
    RANGE    = Math.max(...samples) - BASELINE;
    if (RANGE < 40) RANGE = 40; // minimum bereik tegen platte lijnen
    normDisplay.textContent = '✔';
    normDisplay.style.color = '#00AA00';
  } else {
    normDisplay.textContent = '✖';
    normDisplay.style.color = '#FF0000';
  }
  setTimeout(()=>{ normDisplay.style.color=''; }, 2000);

  // Knoppen terug vrijgeven
  activeBtns.forEach(b=> b.disabled = false);
  calibrateBtn.disabled = false;
}

/* ===== Sequentie (random meldingen) ===== */
let seqTimer = null;
function playRandomSound(){
  const arr = [audioWA, audioMes, audioTeams];
  playSound(arr[Math.floor(Math.random()*arr.length)]);
}
function startSequence(){
  if (seqTimer){ clearInterval(seqTimer); }
  playRandomSound(); // meteen een eerste geluid
  const end = Date.now() + SEQ_DURATION;
  seqTimer = setInterval(()=>{
    if (Date.now() >= end){
      clearInterval(seqTimer);
      seqTimer = null;
    } else {
      playRandomSound();
    }
  }, SEQ_INTERVAL);
}

/* ===== Event-listeners ===== */
connectBtn .addEventListener('click', connectSerial);
calibrateBtn.addEventListener('click', startCalibration);
whatsappBtn.addEventListener('click', ()=> playSound(audioWA));
messengerBtn.addEventListener('click', ()=> playSound(audioMes));
teamsBtn    .addEventListener('click', ()=> playSound(audioTeams));
sequenceBtn .addEventListener('click', startSequence);
