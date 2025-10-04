// Инициализация Telegram WebApp
Telegram.WebApp.ready();
Telegram.WebApp.expand();

// Инициализация карты на Dublin, Ohio
const map = L.map('map').setView([40.0997, -83.1141], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// === Автоматический запрос геолокации при запуске ===
async function requestInitialLocation() {
  // 1. Пробуем через Telegram (если у Telegram уже есть доступ)
  try {
    const loc = await Telegram.WebApp.getLocation({ request_access: true });
    if (loc && loc.latitude) {
      setUserLocation(loc.latitude, loc.longitude);
      return;
    }
  } catch (e) {
    console.log("Telegram API didn't return location");
  }

  // 2. Если Telegram не дал — принудительно вызываем системный запрос
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation(pos.coords.latitude, pos.coords.longitude),
      () => console.warn("User denied geolocation")
    );
  }
}

let userLat = null;
let userLng = null;
let userMarker = null;

function setUserLocation(lat, lng) {
  userLat = lat;
  userLng = lng;

  map.setView([lat, lng], 15);

  // Удаляем предыдущую точку если была
  if (userMarker) map.removeLayer(userMarker);

  // Добавляем зелёную точку (круг)
  userMarker = L.circleMarker([lat, lng], {
    radius: 8,
    color: "#00FF00",
    fillColor: "#00FF00",
    fillOpacity: 1
  }).addTo(map);
}


// Запуск при входе в Mini App
document.addEventListener("DOMContentLoaded", requestInitialLocation);


// DOM элементы
const reportModal = document.getElementById('reportModal');
const modalOverlay = document.getElementById('modalOverlay');
const reportLocation = document.getElementById('reportLocation');
const reportComment = document.getElementById('reportComment');
const addReportBtn = document.getElementById('addReportBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const reportList = document.getElementById('reportList');
const listBtn = document.getElementById('listBtn');
const reportsUL = document.getElementById('reportsUL');
const controls = document.querySelector('.controls');
const closeListBtn = document.getElementById('closeListBtn');

let reports = [];

// Функции открытия/закрытия модалки
function openModal() {
  reportModal.classList.add('show');
  modalOverlay.classList.add('show');
}
function closeModal() {
  reportModal.classList.remove('show');
  modalOverlay.classList.remove('show');
}

// Обратное геокодирование
async function getAddress(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
    );
    const data = await response.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

// Форматирование времени
function formatTimeAgo(timestamp) {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600)
    return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) === 1 ? '' : 's'} ago`;
  return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) === 1 ? '' : 's'} ago`;
}

// Добавление репорта
function addReport(lat, lng, address, comment) {
  const timestamp = Date.now();
  const popupContent = `<b>${address}</b><br>${comment || 'No comment'}<br><small style="color:#666">${formatTimeAgo(timestamp)}</small>`;
  const marker = L.marker([lat, lng]).addTo(map).bindPopup(popupContent);
  reports.push({ marker, address, comment, timestamp });
  updateReportList();

  // автоудаление через 5 минут
  setTimeout(() => {
    map.removeLayer(marker);
    reports = reports.filter((r) => r.marker !== marker);
    updateReportList();
  }, 5 * 60 * 1000);
}

// Обновление списка репортов
function updateReportList() {
  reportsUL.innerHTML = '';
  [...reports].sort((a, b) => b.timestamp - a.timestamp).forEach((r) => {
    const li = document.createElement('li');
    li.innerHTML = `<b>${r.address}</b><br>${r.comment || 'No comment'}<br><small style="color:#666">${formatTimeAgo(r.timestamp)}</small>`;
    li.onclick = () => { map.setView(r.marker.getLatLng(), 15); r.marker.openPopup(); };
    reportsUL.appendChild(li);
  });
}

// Клик по карте для добавления репорта
map.on('click', async (e) => {
  const lat = e.latlng.lat, lng = e.latlng.lng;
  const address = await getAddress(lat, lng);
  reportLocation.textContent = `Location: ${address}`;
  reportComment.value = '';
  openModal();
  addReportBtn.onclick = () => { addReport(lat, lng, address, reportComment.value || 'No comment'); closeModal(); };
});

document.getElementById('reportBtn').addEventListener('click', () => {
  if (userLat && userLng) {
    getAddress(userLat, userLng).then((address) => {
      reportLocation.textContent = `Location: ${address}`;
      reportComment.value = '';
      openModal();
      addReportBtn.onclick = () => { addReport(userLat, userLng, address, reportComment.value || 'No comment'); closeModal(); };
    });
  } else {
    alert("Не удалось определить геолокацию. Попробуйте позже.");
  }
});


// Закрытие модалки
closeModalBtn.onclick = closeModal;
modalOverlay.onclick = closeModal;

// === List открытие/закрытие ===
listBtn.addEventListener('click', () => {
  reportList.style.display = 'flex';
  reportList.style.flexDirection = 'column';
  controls.style.display = 'none'; // скрываем кнопки за list
});

closeListBtn.addEventListener('click', () => {
  reportList.style.display = 'none';
  controls.style.display = 'flex'; // возвращаем кнопки
});
