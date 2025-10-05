// Инициализация геолокации и слежения при загрузке страницы
document.addEventListener("DOMContentLoaded", async () => {
  // Проверяем Telegram WebApp локацию
  try {
    const loc = await Telegram.WebApp.getLocation({request_access:true});
    if(loc && loc.latitude){
      setUserLocation(loc.latitude, loc.longitude);
      if(settings.geolocation) startWatching();
    }
  } catch {
    // если отказ — проверяем галочку
    if(settings.geolocation){
      navigator.geolocation.getCurrentPosition(pos => {
        setUserLocation(pos.coords.latitude, pos.coords.longitude);
        startWatching();
      }, ()=>console.warn("User denied geolocation"));
    }
  }
});
// Отключить слежение за геолокацией и удалить маркер пользователя
function disableWatching() {
  // Останавливаем слежение
  if (typeof watchId !== 'undefined' && watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  // Удаляем маркер пользователя с карты
  if (typeof userMarker !== 'undefined' && userMarker) {
    map.removeLayer(userMarker);
    userMarker = null;
  }

  // Обнуляем координаты
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
const db = firebase.database();

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
@keyframes pulse { 0% { transform: scale(1); opacity:1; } 50% { transform: scale(1.3); opacity:0.6; } 100% { transform: scale(1); opacity:1; } }`;
document.head.appendChild(style);

let userLat = null;
let userLng = null;
let userMarker = null;
let isMapMovedByUser = false;
let watchId = null;
map.on('movestart', () => { isMapMovedByUser = true; });

function setUserLocation(lat, lng) {
  // Если геолокация отключена — маркер не ставим и удаляем существующий
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

// Загружаем настройки или создаем дефолт
let settings = JSON.parse(localStorage.getItem('aga_settings')) || { geolocation: false, language: 'en' };
geoToggle.checked = settings.geolocation;
languageSelect.value = settings.language;

// Переход на экран настроек
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
  } catch { /* пользователь не дал */ }
  localStorage.setItem('aga_settings', JSON.stringify(settings));
}

function startWatching() {
  // если галочка выключена или уже смотрим — не делаем
  if (!settings.geolocation || watchId !== null) return;

  if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(pos => {
      // проверка галочки при каждом обновлении
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

  // удаляем маркер
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
    // Если уже был доступ через Telegram при старте, просто включаем слежение
    if(userLat && userLng){
      startWatching();
      return;
    }

    // Иначе запрашиваем стандартно через браузер
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

// ==== Инициализация при загрузке страницы ====
document.addEventListener('DOMContentLoaded', checkInitialPermission);

// ==== Кнопка локатора ====
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
    for(const id in data) if(now - data[id].timestamp > 5*60*1000) db.ref('reports/'+id).remove();
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
  for(const id in data){
    const r = data[id];
    if(!markersMap[id]){
      const popupContent=`<b>${r.address}</b><br>${r.comment||'No comment'}<br><small style="color:#666">${formatTimeAgo(r.timestamp)}</small>`;
      const marker = L.marker([r.lat,r.lng]).addTo(map).bindPopup(popupContent);
      markersMap[id] = marker;
    }
  }
  updateReportList(data);
});

// ==== Клик по карте ====
map.on('click', async e=>{
  const lat=e.latlng.lat, lng=e.latlng.lng;
  const address = await getAddress(lat,lng);
  reportLocation.textContent=`Location: ${address}`;
  reportComment.value='';
  openModal();
  addReportBtn.onclick=()=>{ addReport(lat,lng,address,reportComment.value||'No comment'); closeModal(); };
});

// ==== Кнопка Report ====
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

// ==== Закрытие модалки ====
closeModalBtn.onclick = closeModal;
modalOverlay.onclick = closeModal;

// ==== Список репортов ====
listBtn.addEventListener('click', ()=>{ cleanOldReports(); reportList.style.display='flex'; reportList.style.flexDirection='column'; });
closeListBtn.addEventListener('click', ()=>{ reportList.style.display='none'; });

// ==== Настройки языка ====
languageSelect.addEventListener('change', ()=>{
  settings.language = languageSelect.value;
  localStorage.setItem('aga_settings', JSON.stringify(settings));
});
