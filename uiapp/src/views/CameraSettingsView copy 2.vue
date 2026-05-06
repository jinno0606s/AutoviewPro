<script setup>
import { ref, onMounted,nextTick } from "vue"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
mapboxgl.accessToken =
import.meta.env.VITE_MAPBOX_TOKEN
const showMap = ref(false)
const cameras = ref([])
const newCameraName = ref("")
const newRtspUrl = ref("")
const newAddress = ref("")
const newLat = ref("")
const newLng = ref("")
const busy = ref(false)
const testingId = ref(null)
let editingCamera = null
let marker = null
let map = null

const DEFAULT_CENTER = [
 Number(import.meta.env.VITE_MAP_CENTER_LNG),
 Number(import.meta.env.VITE_MAP_CENTER_LAT)
]
const DEFAULT_ZOOM =
 Number(import.meta.env.VITE_MAP_ZOOM || 12)

async function loadCameras() {
  try {
    cameras.value = (await window.autoview.getCameras()) || []
  } catch (e) {
    console.log("getCameras error:", e)
    cameras.value = []
  }
}

onMounted(async()=>{

 await loadCameras()

 const pos =
 await window.autoview.getTempLocation()

 if(pos){

   newLat.value = pos.lat
   newLng.value = pos.lng

 }

})


async function addCamera() {
  if (!newRtspUrl.value || !newCameraName.value) return

  await window.autoview.saveCamera({
    name: newCameraName.value,
    rtsp_url: newRtspUrl.value,
    address: newAddress.value,
    lat: newLat.value ? Number(newLat.value) : null,
    lng: newLng.value ? Number(newLng.value) : null
  })

  await loadCameras()

  newCameraName.value = ""
  newRtspUrl.value = ""
  newAddress.value = ""
  newLat.value = ""
  newLng.value = ""
}

async function saveCamera(cam) {
  await window.autoview.updateCamera({
    id: cam.id,
    name: cam.name,
    rtsp_url: cam.rtsp_url,
    address: cam.address,
    lat: cam.lat ? Number(cam.lat) : null,
    lng: cam.lng ? Number(cam.lng) : null
  })

  await loadCameras()
}

async function onToggle(cam) {
  const newValue = cam.enabled === 1 ? 0 : 1

  await window.autoview.setCameraEnabled({
    id: cam.id,
    enabled: newValue
  })

  cam.enabled = newValue
}

async function testCamera(cam) {
  if (busy.value) return

  busy.value = true
  testingId.value = cam.id

  try {
    await window.autoview.startLiveTest({
      url: cam.rtsp_url,
      name: cam.name
    })
  } finally {
    setTimeout(() => {
      busy.value = false
    }, 800)
  }
}

function stopCamera() {
  window.autoview.stopLiveTest()
  testingId.value = null
}

//import { nextTick } from "vue"

function openMap(cam){

 editingCamera = cam

 showMap.value = true

 startMap(cam.address, cam.lat, cam.lng)

}


function closeMap(){

 showMap.value = false

 if(map){
   map.remove()
   map=null
 }

}

async function startMap(address, lat, lng){

 await nextTick()

 mapboxgl.accessToken =
 import.meta.env.VITE_MAPBOX_TOKEN

 let center = [
   Number(import.meta.env.VITE_MAP_CENTER_LNG),
   Number(import.meta.env.VITE_MAP_CENTER_LAT)
 ]

 // lat lng がある場合（編集）
 if(lat && lng){

   center = [Number(lng), Number(lat)]

 }

 // 住所がある場合（新規）
 else if(address){

   try{

     const r =
     await window.autoview.geocodeAddress(address)

     if(r && r.ok){

       center = [Number(r.lng), Number(r.lat)]

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

 // marker 作成
 marker = new mapboxgl.Marker({color:"red"})
   .setLngLat(center)
   .addTo(map)

 // クリック
 map.on("click",(e)=>{

   const lat = e.lngLat.lat
   const lng = e.lngLat.lng

   marker.setLngLat([lng,lat])

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

 editingCamera = null

 showMap.value = true

 startMap(newAddress.value, newLat.value, newLng.value)

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
  <div class="settings">
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
          <th>Status</th>
          <th>Save</th>
          <th>Test</th>
          <th>GEO</th>
          <th>MAP</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="cam in cameras" :key="cam.id">
          <td>{{ cam.id }}</td>

          <td>
            <input v-model="cam.name" />
          </td>

          <td>
            <input v-model="cam.rtsp_url" style="width:340px" />
          </td>

          <td>
            <input v-model="cam.address" style="width:220px" />
          </td>

          <td>
            <input v-model="cam.lat" style="width:110px" />
          </td>

          <td>
            <input v-model="cam.lng" style="width:110px" />
          </td>

          <td>
            <input
              type="checkbox"
              :checked="cam.enabled === 1"
              @change="onToggle(cam)"
            />
          </td>

          <td>
            <span :style="{ color: cam.enabled === 1 ? 'green' : 'red' }">
              {{ cam.enabled === 1 ? "ENABLED" : "DISABLED" }}
            </span>
          </td>

          <td>
            <button @click="saveCamera(cam)">Save</button>
          </td>

          <td>
            <button
              :disabled="busy"
              @click="testCamera(cam)"
              :style="{
                background: testingId === cam.id ? '#00aa00' : '#444',
                color: 'white'
              }"
            >
              ▶ Live
            </button>
          </td>

          <td>
            <button @click="geocode(cam)">GEO</button>
          </td>

          <td>
            <button @click="openMap(cam)">MAP</button>
          </td>
        </tr>
      </tbody>
    </table>

    <h3>Add Camera</h3>

    <div class="add">
      <input v-model="newCameraName" placeholder="Camera Name" />
      <input v-model="newRtspUrl" placeholder="rtsp://..." style="width:320px" />
      <input v-model="newAddress" placeholder="Address" style="width:220px" />
      <input v-model="newLat" placeholder="lat" style="width:120px" />
      <input v-model="newLng" placeholder="lng" style="width:120px" />

      <button @click="geocodeNew">GEO</button>
      <button @click="openMapNew">MAP</button>

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
    <!-- MAP POPUP -->

    <div v-if="showMap" class="map-overlay">

      <div class="map-window">

        <div class="map-title">

          MAPで位置をクリック

          <button @click="closeMap">閉じる</button>

        </div>

        <div id="pickmap"></div>

      </div>

    </div>


  </div>
  
</template>

<style scoped>
.settings {
  padding: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

td, th {
  border: 1px solid #ccc;
  padding: 6px;
}

input {
  padding: 4px;
}

button {
  padding: 6px 10px;
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

</style>