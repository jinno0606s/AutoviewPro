<script setup>
import { ref, onMounted,nextTick } from "vue"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import MapPopup from "../components/MapPopup.vue"
mapboxgl.accessToken =
import.meta.env.VITE_MAPBOX_TOKEN
import  api  from "../api/api"

const showMap = ref(false)
const cameras = ref([])
const newCameraName = ref("")
const newRtspUrl = ref("")
const newAddress = ref("")
const newLat = ref("")
const newLng = ref("")
const busy = ref(false)
const testingId = ref(null)
const mapAddress = ref("")
const mapLat = ref(null)
const mapLng = ref(null)

import PtzPopup from "../components/PtzPopup.vue"
const showPtz = ref(false)
const editingCamera = ref(null)

//let editingCamera = null
let marker = null
let map = null

function openMap(){
  showMap.value = true
}

function closeMap(){
  showMap.value = false
}

const DEFAULT_CENTER = [
 Number(import.meta.env.VITE_MAP_CENTER_LNG),
 Number(import.meta.env.VITE_MAP_CENTER_LAT)
]
const DEFAULT_ZOOM =
 Number(import.meta.env.VITE_MAP_ZOOM || 12)
/*
async function loadCameras() {
  try {
    cameras.value = (await window.autoview.getCameras()) || []
  } catch (e) {
    console.log("getCameras error:", e)
    cameras.value = []
  }
}
*/

async function loadCameras(){

 try{

  if(window.autoview){

    cameras.value =
    await window.autoview.getCameras()

  }else{

    const r =
    await fetch("/api/cameras")

    cameras.value =
    await r.json()

  }

 }catch(e){

  console.log(e)

 }

}

// PTZコントロール
function openPtz(cam){

 editingCamera.value = cam
 showPtz.value = true

}

function closePtz(){

 showPtz.value = false
 editingCamera.value = null

}

onMounted(async()=>{

  await loadCameras()

  let pos = null

  if(window.autoview){
    pos = await window.autoview.getTempLocation()
  }

  if(pos){
    newLat.value = pos.lat
    newLng.value = pos.lng
  }

})

/*
onMounted(async()=>{

 await loadCameras()

 const pos =
 await window.autoview.getTempLocation()

 if(pos){

   newLat.value = pos.lat
   newLng.value = pos.lng

 }

})
*/

async function addCamera() {
  if (!newRtspUrl.value || !newCameraName.value) return

  await window.autoview.saveCamera({
    name: newCameraName.value,
    rtsp_url: newRtspUrl.value,
    address: newAddress.value,
    lat: newLat.value ? Number(newLat.value) : null,
    lng: newLng.value ? Number(newLng.value) : null,
    enabled: 0,
    people_count_enabled: 0,
    people_count_type: "ai"
  })

  await loadCameras()

  newCameraName.value = ""
  newRtspUrl.value = ""
  newAddress.value = ""
  newLat.value = ""
  newLng.value = ""
}

// 保存
async function saveCamera(cam){

  const payload = {
    id: cam.id,
    name: cam.name,
    rtsp_url: cam.rtsp_url,
    address: cam.address,
    lat: cam.lat ? Number(cam.lat) : null,
    lng: cam.lng ? Number(cam.lng) : null,
    enabled: Number(cam.enabled),
    people_count_enabled: cam.people_count_enabled || 0,
    people_count_type: cam.people_count_type || "ai"
  }
   console.log("🟡 TOGGLE後", cam.enabled)
   console.log("📤 SEND", payload)   // ←追加
   
  if(window.autoview){
    await window.autoview.updateCamera(payload)
  }else{
    await fetch("/api/cameras/update",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    })
   // await loadCameras()
  }

}

async function onToggle(cam) {
  cam.enabled = Number(cam.enabled) === 1 ? 0 : 1

  console.log("🟡 TOGGLE後", cam.enabled)

  await saveCamera(cam)
}

async function testCamera(cam){

  if (busy.value) return

  busy.value = true
  testingId.value = cam.id

  try {

    await api.startLiveTest({
      id: cam.id,
      url: cam.rtsp_url,
      name: cam.name
    })

  } finally {

    setTimeout(()=>{
      busy.value = false
    },800)

  }
}

function stopCamera() {
  window.autoview.stopLiveTest()
  testingId.value = null
}

// People Count
async function onTogglePeople(cam){
  cam.people_count_enabled = cam.people_count_enabled === 1 ? 0 : 1
  await saveCamera(cam)
}

async function startMap(address, lat, lng){

 console.log("START MAP")
 console.log("address =", address)
 console.log("lat =", lat)
 console.log("lng =", lng)


 await nextTick()

 mapboxgl.accessToken =
 import.meta.env.VITE_MAPBOX_TOKEN

 let center = [
   Number(import.meta.env.VITE_MAP_CENTER_LNG),
   Number(import.meta.env.VITE_MAP_CENTER_LAT)
 ]

 // lat/lng がある場合
if(lat != null && lng != null){

   center = [Number(lng), Number(lat)]

 }
 // 住所がある場合
 else if(address){
console.log("GEOCODE ADDRESS =", address)   //////////////////
   try{

     const r =
     await window.autoview.geocodeAddress(address)

     if(r && r.ok){

       center = [Number(r.lng), Number(r.lat)]

       if(editingCamera){
         editingCamera.lat = Number(r.lat)
         editingCamera.lng = Number(r.lng)
       }else{
         newLat.value = Number(r.lat)
         newLng.value = Number(r.lng)
       }

     }

   }catch(e){

     console.log("geocode error", e)

   }

 }

 map = new mapboxgl.Map({

   container:"pickmap",

   style: import.meta.env.VITE_MAP_STYLE
          || "mapbox://styles/mapbox/streets-v12",

   center:center,

   zoom:Number(import.meta.env.VITE_MAP_ZOOM || 14)

 })

 // Mapロード待ち
 map.on("load",()=>{

   marker = new mapboxgl.Marker({color:"red"})
     .setLngLat(center)
     .addTo(map)

 })

 // MAPクリック
 map.on("click",(e)=>{

   const lat = Number(e.lngLat.lat)
   const lng = Number(e.lngLat.lng)

   if(marker){
     marker.setLngLat([lng,lat])
   }

   if(editingCamera){

     editingCamera.lat = lat
     editingCamera.lng = lng

   }else{

     newLat.value = lat
     newLng.value = lng

   }

 })

}


function openMapNew(){

 mapAddress.value = newAddress.value
 mapLat.value = newLat.value
 mapLng.value = newLng.value

 showMap.value = true

}

function onMapSelect(pos){

 newLat.value = pos.lat
 newLng.value = pos.lng

}

async function geocode(cam) {
  if (!cam.address) {
    alert("住所を入力してください")
    return
  }

  try {
    const r = await window.autoview.geocodeAddress(cam.address)

    if (!r || !r.ok) {
      alert("住所が見つかりません")
      return
    }

    cam.lat = Number(r.lat)
    cam.lng = Number(r.lng)

    await window.autoview.updateCamera({
      id: cam.id,
      name: cam.name,
      rtsp_url: cam.rtsp_url,
      address: cam.address,
      lat: cam.lat,
      lng: cam.lng
    })

    await loadCameras()
    alert("緯度経度を保存しました")
  } catch (e) {
    console.log("geocode error:", e)
    alert("GEO取得エラー")
  }
}

async function geocodeNew() {
  if (!newAddress.value) {
    alert("住所を入力してください")
    return
  }

  try {
    const r = await window.autoview.geocodeAddress(newAddress.value)

    if (!r || !r.ok) {
      alert("住所が見つかりません")
      return
    }

    newLat.value = Number(r.lat)
    newLng.value = Number(r.lng)

    alert("緯度経度取得")
  } catch (e) {
    console.log("geocodeNew error:", e)
    alert("GEO取得エラー")
  }
}
</script>


<template>
  <div class="view-root">
    <h2>Camera Settings</h2>

    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>RTSP URL</th>
          <th>Address</th>
          <th>Lat</th>
          <th>Lng</th>
          <th>Enabled</th>
          <th>People</th>
          <th>Type</th>
          <th>Test</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="cam in cameras" :key="cam.id">
          <td>{{ cam.id }}</td>

          <td>
            <input v-model="cam.name" @change="saveCamera(cam)" />
          </td>

          <td>
            <input v-model="cam.rtsp_url" @change="saveCamera(cam)" />
          </td>

          <td>
            <input v-model="cam.address" @change="saveCamera(cam)" />
          </td>

          <td>
            <input v-model="cam.lat" @change="saveCamera(cam)" />
          </td>

          <td>
            <input v-model="cam.lng" @change="saveCamera(cam)" />
          </td>

          <td>
            <input
              type="checkbox"
              :checked="cam.enabled === 1"
              @change="onToggle(cam)"
            />
          </td>

          <td>
            <input
              type="checkbox"
              :checked="cam.people_count_enabled === 1"
              @change="onTogglePeople(cam)"
            />
          </td>

          <td>
            <select v-model="cam.people_count_type" @change="saveCamera(cam)">
              <option value="ai">AI</option>
              <option value="axis">AXIS</option>
            </select>
          </td>

          <td>
            <button
              @click="testCamera(cam)"
              :disabled="busy && testingId !== cam.id"
            >
              {{ testingId === cam.id ? "TEST中..." : "TEST" }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <h3>Add Camera</h3>

    <div class="add">
      <input v-model="newCameraName" placeholder="Camera Name" />
      <input v-model="newRtspUrl" placeholder="rtsp://..." />
      <input v-model="newAddress" placeholder="Address" />
      <input v-model="newLat" placeholder="lat" />
      <input v-model="newLng" placeholder="lng" />

      <button
        :disabled="!newCameraName || !newRtspUrl"
        @click="addCamera"
      >
        ＋ Add Camera
      </button>
    </div>

    <div class="stop">
      <button @click="stopCamera">■ STOP LIVE TEST</button>
    </div>

    <MapPopup
      v-if="showMap"
      :address="mapAddress"
      :lat="mapLat"
      :lng="mapLng"
      @select="onMapSelect"
      @close="showMap=false"
    />
    
    <PtzPopup
      v-if="showPtz"
      :camera="editingCamera"
      @close="closePtz"
    />

  </div>
  
</template>

<style scoped>
html, body {
  margin:0;
  padding:0;
  width:100%;
  background:#202020;   /* ←これが効く */
}

.view-root{
  width:100%;
  min-height: calc(100vh - 60px);
  background:#202020;
  color:white;
  padding:20px;
}

.settings {
  padding: 20px;
  overflow-x: auto;  /* ←横スクロール */
}

table {
  min-width: 1400px; /* ←横長対策 */
  border-collapse: collapse;
}

td, th {
  border: 1px solid #444;
  padding: 6px;
  text-align: center;
}

input.lat,
input.lng {
  width: 90px;
}

input {
  padding: 6px;
  border-radius: 4px;
  border: 1px solid #555;
  background: #111;
  color: white;
}

button {
  padding: 6px 10px;
  border-radius: 4px;
  border: none;
  background: #444;
  color: white;
  cursor: pointer;
}

button:hover {
  background: #666;
}

.add {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.stop {
  margin-top: 20px;
}

.map-overlay{
position:fixed;
left:0;
top:0;
width:100%;
height:100%;
background:rgba(0,0,0,0.4);
display:flex;
align-items:center;
justify-content:center;
z-index:9999;
}

.map-window{
width:800px;
height:500px;
background:white;
display:flex;
flex-direction:column;
border-radius:6px;
overflow:hidden;
}

.map-title{
padding:10px;
background:#f0f0f0;
display:flex;
justify-content:space-between;
}

#pickmap{
flex:1;
}

.count-on {
  color: #00ff88;
  font-weight: bold;
}

</style>