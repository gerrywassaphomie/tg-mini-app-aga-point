// Telegram WebApp
Telegram.WebApp.ready();
Telegram.WebApp.expand();

// === Карта с Carto ===
const map = L.map('map').setView([40.0997, -83.1141], 13);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

// === Пульсирующая иконка пользователя ===
const userIcon = L.divIcon({
  html: '<div style="width:14px;height:14px;background:limegreen;border-radius:50%;box-shadow:0 0 6px rgba(0,0,0,0.6);animation:pulse 1.5s infinite;"></div>',
  className: '', iconSize: [14,14]
});

let userLat = null, userLng = null, userMarker = null, watching = false;

function setUserLocation(lat,lng){
  userLat=lat; userLng=lng; map.setView([lat,lng],15);
  if(!userMarker) userMarker=L.marker([lat,lng],{icon:userIcon}).addTo(map).bindPopup('Your location');
  else userMarker.setLatLng([lat,lng]);
}

// Запрос локации
async function requestInitialLocation(){
  try {
    const loc = await Telegram.WebApp.getLocation({ request_access: true });
    if(loc?.latitude){ setUserLocation(loc.latitude, loc.longitude); enableWatching(); return; }
  } catch{}
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(pos=>{ setUserLocation(pos.coords.latitude,pos.coords.longitude); enableWatching(); }, ()=>console.warn("User denied geolocation"));
  }
}

function enableWatching(){
  if(watching) return;
  if(navigator.geolocation) navigator.geolocation.watchPosition(pos=>setUserLocation(pos.coords.latitude,pos.coords.longitude));
  watching=true;
}

document.addEventListener("DOMContentLoaded", requestInitialLocation);

// Кнопка гео
document.getElementById('locateBtn').addEventListener('click', ()=>{
  if(userLat && userLng){ map.setView([userLat,userLng],15); userMarker?.openPopup(); }
  else requestInitialLocation();
});

// === Репорты ===
const reportModal=document.getElementById('reportModal');
const modalOverlay=document.getElementById('modalOverlay');
const reportLocation=document.getElementById('reportLocation');
const reportComment=document.getElementById('reportComment');
const addReportBtn=document.getElementById('addReportBtn');
const closeModalBtn=document.getElementById('closeModalBtn');
const reportList=document.getElementById('reportList');
const listBtn=document.getElementById('listBtn');
const reportsUL=document.getElementById('reportsUL');
const controls=document.querySelector('.controls');
const closeListBtn=document.getElementById('closeListBtn');

let reports=[];

function openModal(){ reportModal.classList.add('show'); modalOverlay.classList.add('show'); }
function closeModal(){ reportModal.classList.remove('show'); modalOverlay.classList.remove('show'); }

async function getAddress(lat,lng){
  try{
    const res=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
    const data=await res.json(); return data.display_name || `${lat.toFixed(5)},${lng.toFixed(5)}`;
  }catch{ return `${lat.toFixed(5)},${lng.toFixed(5)}`; }
}

function formatTimeAgo(ts){
  const diff=Math.floor((Date.now()-ts)/1000);
  if(diff<60) return 'just now';
  if(diff<3600) return `${Math.floor(diff/60)} minute${Math.floor(diff/60)===1?'':'s'} ago`;
  return `${Math.floor(diff/3600)} hour${Math.floor(diff/3600)===1?'':'s'} ago`;
}

function addReport(lat,lng,address,comment){
  const ts=Date.now();
  const marker=L.marker([lat,lng]).addTo(map).bindPopup(`<b>${address}</b><br>${comment||'No comment'}<br><small style="color:#666">${formatTimeAgo(ts)}</small>`);
  reports.push({marker,address,comment,timestamp:ts});
  updateReportList();
  setTimeout(()=>{ map.removeLayer(marker); reports=reports.filter(r=>r.marker!==marker); updateReportList(); },5*60*1000);
}

function updateReportList(){
  reportsUL.innerHTML='';
  [...reports].sort((a,b)=>b.timestamp-a.timestamp).forEach(r=>{
    const li=document.createElement('li');
    li.innerHTML=`<b>${r.address}</b><br>${r.comment||'No comment'}<br><small style="color:#666">${formatTimeAgo(r.timestamp)}</small>`;
    li.onclick=()=>{ map.setView(r.marker.getLatLng(),15); r.marker.openPopup(); };
    reportsUL.appendChild(li);
  });
}

// Добавление через клик по карте
map.on('click', async e=>{
  const lat=e.latlng.lat,lng=e.latlng.lng;
  const addr=await getAddress(lat,lng);
  reportLocation.textContent=`Location: ${addr}`;
  reportComment.value='';
  openModal();
  addReportBtn.onclick=()=>{ addReport(lat,lng,addr,reportComment.value||'No comment'); closeModal(); };
});

// Кнопка Report
document.getElementById('reportBtn').addEventListener('click', ()=>{
  if(userLat && userLng){
    getAddress(userLat,userLng).then(addr=>{
      reportLocation.textContent=`Location: ${addr}`;
      reportComment.value='';
      openModal();
      addReportBtn.onclick=()=>{ addReport(userLat,userLng,addr,reportComment.value||'No comment'); closeModal(); };
    });
  }else alert("Не удалось определить геолокацию. Попробуйте позже.");
});

// Закрытие модалки
closeModalBtn.onclick=closeModal;
modalOverlay.onclick=closeModal;

// === List открытие/закрытие ===
listBtn.addEventListener('click', ()=>{
  reportList.style.display='flex'; reportList.style.flexDirection='column'; controls.style.display='none';
});
closeListBtn.addEventListener('click', ()=>{
  reportList.style.display='none'; controls.style.display='flex';
});
