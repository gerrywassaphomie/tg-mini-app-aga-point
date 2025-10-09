// ==== ТВОЙ ОРИГИНАЛЬНЫЙ КОД ====

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const loc = await Telegram.WebApp.getLocation({request_access:true});
    if(loc && loc.latitude){
      setUserLocation(loc.latitude, loc.longitude);
      if(settings.geolocation) startWatching();
    }
  } catch {
    if(settings.geolocation){
      navigator.geolocation.getCurrentPosition(pos => {
        setUserLocation(pos.coords.latitude, pos.coords.longitude);
        startWatching();
      }, ()=>console.warn("User denied geolocation"));
    }
  }
});

function disableWatching() {
  if (typeof watchId !== 'undefined' && watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (typeof userMarker !== 'undefined' && userMarker) {
    map.removeLayer(userMarker);
    userMarker = null;
  }
  if (typeof userLat !== 'undefined') userLat = null;
  if (typeof userLng !== 'undefined') userLng = null;
}

// ==== Firebase ====
const firebaseConfig = {
  apiKey: "AIzaSyAewiWJkA2d6QIDDqsBTM49CR4w9wm_3q4",
  authDomain: "aga-point.firebaseapp.com",
  databaseURL: "https://aga-point-default-rtdb.firebaseio.com",
  projectId: "aga-point",
  storageBucket: "aga-point.appspot.com",
  messagingSenderId: "168086303945",
  appId: "1:168086303945:web:e9c95442a8d60c3b1dc918"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database(); // ✅ исправлено

// ==== Telegram WebApp ====
Telegram.WebApp.ready();
Telegram.WebApp.expand();

// ==== Карта ====
const map = L.map('map').setView([40.0997, -83.1141], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// ==== Пульсирующая иконка пользователя ====
const userIcon = L.divIcon({
  html: '<div style="width:14px;height:14px;background:limegreen;border-radius:50%;box-shadow:0 0 6px rgba(0,0,0,0.6);animation:pulse 1.5s infinite;"></div>',
  className: '',
  iconSize: [14, 14]
});
const style = document.createElement('style');
style.innerHTML = `
@keyframes pulse {
  0% { transform: scale(1); opacity:1; }
  50% { transform: scale(1.3); opacity:0.6; }
  100% { transform: scale(1); opacity:1; }
}`;
document.head.appendChild(style);

let userLat = null;
let userLng = null;
let userMarker = null;
let isMapMovedByUser = false;
let watchId = null;
map.on('movestart', () => { isMapMovedByUser = true; });

function setUserLocation(lat, lng) {
  if (!settings.geolocation) {
    if (userMarker) {
      map.removeLayer(userMarker);
      userMarker = null;
    }
    userLat = null;
    userLng = null;
    return;
  }
  userLat = lat;
  userLng = lng;
  if (!userMarker) {
    userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map).bindPopup('Your location');
    map.setView([lat, lng], 15);
  } else {
    userMarker.setLatLng([lat, lng]);
  }
}

// ==== Настройки ====
const settingsBtn = document.getElementById('settingsBtn');
const backBtn = document.getElementById('backBtn');
const mainScreen = document.getElementById('mainScreen');
const settingsScreen = document.getElementById('settingsScreen');
const geoToggle = document.getElementById('geoToggle');
const languageSelect = document.getElementById('languageSelect');

let settings = JSON.parse(localStorage.getItem('aga_settings')) || { geolocation: false, language: 'en' };
geoToggle.checked = settings.geolocation;
languageSelect.value = settings.language;

settingsBtn.addEventListener('click', () => {
  mainScreen.classList.add('hidden');
  settingsScreen.classList.add('show');
});
backBtn.addEventListener('click', () => {
  mainScreen.classList.remove('hidden');
  settingsScreen.classList.remove('show');
});

// ==== Геолокация ====
async function checkInitialPermission() {
  try {
    const loc = await Telegram.WebApp.getLocation({request_access:true});
    if(loc && loc.latitude) {
      settings.geolocation = true;
      geoToggle.checked = true;
      setUserLocation(loc.latitude, loc.longitude);
      startWatching();
    }
  } catch {}
  localStorage.setItem('aga_settings', JSON.stringify(settings));
}

function startWatching() {
  if (!settings.geolocation || watchId !== null) return;
  if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(pos => {
      if (!settings.geolocation) {
        if (userMarker) {
          map.removeLayer(userMarker);
          userMarker = null;
        }
        userLat = null;
        userLng = null;
        return;
      }
      setUserLocation(pos.coords.latitude, pos.coords.longitude);
    }, err => console.warn(err));
  }
}

function stopWatching() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (userMarker) {
    map.removeLayer(userMarker);
    userMarker = null;
  }
  userLat = null;
  userLng = null;
}

geoToggle.addEventListener('change', () => {
  settings.geolocation = geoToggle.checked;
  localStorage.setItem('aga_settings', JSON.stringify(settings));
  if (geoToggle.checked) {
    if(userLat && userLng){
      startWatching();
      return;
    }
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(pos => {
        setUserLocation(pos.coords.latitude, pos.coords.longitude);
        startWatching();
      }, () => {
        alert("You denied geolocation access");
        geoToggle.checked = false;
        settings.geolocation = false;
        localStorage.setItem('aga_settings', JSON.stringify(settings));
      });
    } else {
      alert("Geolocation is not supported by your browser");
      geoToggle.checked = false;
      settings.geolocation = false;
      localStorage.setItem('aga_settings', JSON.stringify(settings));
    }
  } else {
    stopWatching();
  }
});

document.addEventListener('DOMContentLoaded', checkInitialPermission);

document.getElementById('locateBtn').addEventListener('click', ()=>{
  isMapMovedByUser = false;
  if(userLat && userLng){
    map.setView([userLat,userLng],15);
    if(userMarker) userMarker.openPopup();
  }
});

// ==== Репорты ====
const reportModal = document.getElementById('reportModal');
const modalOverlay = document.getElementById('modalOverlay');
const reportLocation = document.getElementById('reportLocation');
const reportComment = document.getElementById('reportComment');
const addReportBtn = document.getElementById('addReportBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const reportList = document.getElementById('reportList');
const reportsUL = document.getElementById('reportsUL');
const listBtn = document.getElementById('listBtn');
const closeListBtn = document.getElementById('closeListBtn');
const markersMap = {};

function openModal(){ reportModal.classList.add('show'); modalOverlay.classList.add('show'); }
function closeModal(){ reportModal.classList.remove('show'); modalOverlay.classList.remove('show'); }

async function getAddress(lat,lng){
  try{
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch { return `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
}

function formatTimeAgo(ts){
  const diff = Math.floor((Date.now() - ts)/1000);
  if(diff < 60) return 'just now';
  if(diff < 3600) return `${Math.floor(diff/60)} minute${Math.floor(diff/60)===1?'':'s'} ago`;
  return `${Math.floor(diff/3600)} hour${Math.floor(diff/3600)===1?'':'s'} ago`;
}

function addReport(lat,lng,address,comment){
  const timestamp = Date.now();
  const newReportRef = db.ref('reports').push();
  newReportRef.set({lat,lng,address,comment,timestamp});
}

function cleanOldReports() {
  const now = Date.now();
  db.ref('reports').once('value').then(snapshot=>{
    const data = snapshot.val() || {};
    for(const id in data) if(now - data[id].timestamp > 300*60*1000) db.ref('reports/'+id).remove();
  });
}

function updateReportList(data){
  reportsUL.innerHTML='';
  const reportsArray = Object.values(data||{});
  reportsArray.sort((a,b)=>b.timestamp-a.timestamp).forEach(r=>{
    const li = document.createElement('li');
    li.innerHTML=`<b>${r.address}</b><br>${r.comment||'No comment'}<br><small style="color:#666">${formatTimeAgo(r.timestamp)}</small>`;
    li.onclick=()=>{
      const marker = Object.values(markersMap).find(m=>m.getLatLng().lat===r.lat && m.getLatLng().lng===r.lng);
      if(marker){ map.setView(marker.getLatLng(),15); marker.openPopup(); }
    };
    reportsUL.appendChild(li);
  });
}

db.ref('reports').on('value', snapshot=>{
  const data = snapshot.val()||{};
  for(const id in markersMap) if(!data[id]) { map.removeLayer(markersMap[id]); delete markersMap[id]; }

  const svgIcon = L.divIcon({
    html: `<svg width="25" height="41" viewBox="0 0 25 41" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 22 12.5 41 12.5 41C12.5 41 25 22 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="#111" stroke="#fff" stroke-width="0.7"/>
      <circle cx="12.5" cy="12.5" r="5.5" fill="#fff"/>
    </svg>`,
    className: '',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
  });

  for(const id in data){
    const r = data[id];
    if(!markersMap[id]){
      const popupContent=`<b>${r.address}</b><br>${r.comment||'No comment'}<br><small style="color:#666">${formatTimeAgo(r.timestamp)}</small>`;
      const marker = L.marker([r.lat,r.lng], {icon: svgIcon}).addTo(map).bindPopup(popupContent);
      markersMap[id] = marker;
    }
  }
  updateReportList(data);
});

map.on('click', async e=>{
  const lat=e.latlng.lat, lng=e.latlng.lng;
  const address = await getAddress(lat,lng);
  reportLocation.textContent=`Location: ${address}`;
  reportComment.value='';
  openModal();
  addReportBtn.onclick=()=>{ addReport(lat,lng,address,reportComment.value||'No comment'); closeModal(); };
});

document.getElementById('reportBtn').addEventListener('click', ()=>{
  if(userLat && userLng){
    getAddress(userLat,userLng).then(address=>{
      reportLocation.textContent=`Location: ${address}`;
      reportComment.value='';
      openModal();
      addReportBtn.onclick=()=>{ addReport(userLat,userLng,address,reportComment.value||'No comment'); closeModal(); };
    });
  } else alert("Turn on geolocation.");
});

closeModalBtn.onclick = closeModal;
modalOverlay.onclick = closeModal;
listBtn.addEventListener('click', ()=>{ cleanOldReports(); reportList.style.display='flex'; reportList.style.flexDirection='column'; });
closeListBtn.addEventListener('click', ()=>{ reportList.style.display='none'; });
languageSelect.addEventListener('change', ()=>{
  settings.language = languageSelect.value;
  localStorage.setItem('aga_settings', JSON.stringify(settings));
});

// ==== STOPICE ИНТЕГРАЦИЯ ====
const stopiceMarkers = {};
const stopiceIds = new Set();
let stopicePoints = [];

// Универсальный парсер даты StopICE → timestamp
function parseStopiceDate(str) {
  if (!str) return 0;
  // Пример: "oct 8, 2025 (12:27:07) PST"
  const clean = str.replace(/\(.*\)/, '').replace('PST', '').trim();
  const date = new Date(clean);
  return date.getTime() || 0;
}

async function loadStopicePoints() {
  try {
    const res = await fetch("/api/fetchStopice");
    if (!res.ok) throw new Error("Ошибка загрузки /api/fetchStopice");
    const points = await res.json();

    stopicePoints = points.map(p => ({
      id: p.id,
      lat: parseFloat(p.lat),
      lng: parseFloat(p.lon),
      address: p.location || "",
      comment: p.comments || "",
      priority: p.priority || "",
      timestamp: parseStopiceDate(p.timestamp),
      media: p.media || "",
      url: p.url || "",
      source: "stopice"
    }));

    console.log("Загружено точек StopICE:", stopicePoints.length);

    // Удаляем старые StopICE-маркеры
    for (const id in stopiceMarkers) {
      map.removeLayer(stopiceMarkers[id]);
      delete stopiceMarkers[id];
      stopiceIds.delete(id);
    }

    // Добавляем StopICE маркеры на карту
    stopicePoints.forEach(p => {
      if (!p.lat || !p.lng) return;
      const stopiceIcon = L.divIcon({
        html: `<svg width="25" height="41" viewBox="0 0 25 41" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 22 12.5 41 12.5 41C12.5 41 25 22 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="#000000ff" stroke="#fff" stroke-width="0.7"/>
          <circle cx="12.5" cy="12.5" r="5.5" fill="#fff"/>
        </svg>`,
        className: "",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
      });

      const popup = `
        <b>${p.address}</b><br>
        <small>${p.priority}</small><br>
        ${p.comment}<br>
        <small style="color:#666">${formatTimeAgo(p.timestamp)}</small><br>
        ${p.media ? `<img src="${p.media}" width="120"><br>` : ""}
        ${p.url ? `<a href="${p.url}" target="_blank">Источник</a>` : ""}
      `;

      const marker = L.marker([p.lat, p.lng], { icon: stopiceIcon }).addTo(map).bindPopup(popup);
      stopiceMarkers[p.id] = marker;
      stopiceIds.add(p.id);
    });

    // 🔁 Обновляем общий список
    refreshCombinedList();
  } catch (err) {
    console.error("loadStopicePoints error", err);
  }
}

// ==== ОБЪЕДИНЕНИЕ СПИСКОВ ====
function refreshCombinedList() {
  reportsUL.innerHTML = "";

  // Firebase-репорты (из db.ref('reports'))
  const localReports = Object.values(currentFirebaseReports || {}).map(r => ({
    lat: r.lat,
    lng: r.lng,
    address: r.address,
    comment: r.comment,
    timestamp: r.timestamp,
    source: "local"
  }));

  // Комбинируем + сортируем
  const all = [...localReports, ...stopicePoints].sort((a, b) => b.timestamp - a.timestamp);

  all.forEach(r => {
    const li = document.createElement("li");
    li.innerHTML = `
      <b>${r.address}</b><br>
      ${r.comment || "No comment"}<br>
      <small style="color:#666">${formatTimeAgo(r.timestamp)}</small>
      ${r.source === "stopice" ? " 🚨" : ""}
    `;
    li.onclick = () => {
      const marker =
        r.source === "stopice"
          ? Object.values(stopiceMarkers).find(m => m.getLatLng().lat === r.lat && m.getLatLng().lng === r.lng)
          : Object.values(markersMap).find(m => m.getLatLng().lat === r.lat && m.getLatLng().lng === r.lng);
      if (marker) {
        map.setView(marker.getLatLng(), 15);
        marker.openPopup();
      }
    };
    reportsUL.appendChild(li);
  });
}

// === Поддержка обновления Firebase в реальном времени ===
let currentFirebaseReports = {};
db.ref("reports").on("value", snapshot => {
  currentFirebaseReports = snapshot.val() || {};
  refreshCombinedList();
});

// Запуск
document.addEventListener("DOMContentLoaded", loadStopicePoints);
setInterval(loadStopicePoints, 300 * 60 * 1000);
