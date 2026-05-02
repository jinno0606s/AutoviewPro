<script setup>

import { ref, onMounted, nextTick } from "vue"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { api } from "../api/api"

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const speakers = ref([])

const newSpeakerName = ref("")
const newSpeakerIP = ref("")
const newAddress = ref("")
const newLat = ref("")
const newLng = ref("")

const showMap = ref(false)
const mapAddress = ref("")
const mapLat = ref(null)
const mapLng = ref(null)

const editingSpeaker = ref(null)
let map = null
let marker = null

// ======================
// load
// ======================

async function loadSpeakers(){

 speakers.value =
  await window.autoview.getSpeakers()

}

// ======================
// add
// ======================

async function addSpeaker(){

 await window.autoview.saveSpeaker({

   name:newSpeakerName.value,
   ip:newSpeakerIP.value,
   address:newAddress.value,
   lat:newLat.value,
   lng:newLng.value

 })

 newSpeakerName.value=""
 newSpeakerIP.value=""
 newAddress.value=""
 newLat.value=""
 newLng.value=""

 await loadSpeakers()

}

// ======================
// save
// ======================

async function saveSpeaker(sp){

 await window.autoview.updateSpeaker({

  id:sp.id,
  name:sp.name,
  ip:sp.ip,
  address:sp.address,
  lat:sp.lat,
  lng:sp.lng

 })

 await loadSpeakers()

}

// ======================
// speaker test
// ======================

async function testSpeaker(sp){

 console.log("TEST SPEAKER",sp)

 const r =
 await window.autoview.speakerTest({

   ip:sp.ip,
   clip:"logo.mp3"

 })

 console.log("RESULT",r)

}

// ======================
// MAP
// ======================
function openMapSpeaker(sp){

 mapAddress.value = sp.address
 mapLat.value = sp.lat
 mapLng.value = sp.lng

 editingSpeaker.value = sp

 showMap.value = true

}
function onMapSelect(pos){

 if(editingSpeaker){

   editingSpeaker.lat = pos.lat
   editingSpeaker.lng = pos.lng

 }else{

   newLat.value = pos.lat
   newLng.value = pos.lng

 }

}



function openMap(sp){

editingSpeaker.value = sp

 showMap.value = true

 startMap(sp.address,sp.lat,sp.lng)

}

function openMapNew(){

 mapAddress.value = newAddress.value
 mapLat.value = newLat.value
 mapLng.value = newLng.value

 showMap.value = true

}

function closeMap(){

 showMap.value = false

 if(map){
   map.remove()
   map = null
 }

}

// ======================
// MAP START
// ======================
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

       if(editingSpeaker){
         editingSpeaker.lat = Number(r.lat)
         editingSpeaker.lng = Number(r.lng)
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

  console.log("MAP LOADED")

  marker = new mapboxgl.Marker({color:"red"})
    .setLngLat(center)
    .addTo(map)

  setTimeout(()=>{
    map.resize()
  },200)

})

 // MAPクリック
 map.on("click",(e)=>{

   const lat = Number(e.lngLat.lat)
   const lng = Number(e.lngLat.lng)

   if(marker){
     marker.setLngLat([lng,lat])
   }

   if(editingSpeaker){

     editingSpeaker.lat = lat
     editingSpeaker.lng = lng

   }else{

     newLat.value = lat
     newLng.value = lng

   }

 })

}

// ======================

onMounted(loadSpeakers)

</script>

<template>
<div class="view-root">
<h2>Speaker Settings</h2>

<table>

<tr>
<th>ID</th>
<th>Name</th>
<th>IP</th>
<th>Address</th>
<th>Lat</th>
<th>Lng</th>
<th>Save</th>
<th>Test</th>
<th>MAP</th>
</tr>

<tr v-for="sp in speakers" :key="sp.id">

<td>{{sp.id}}</td>

<td>
<input v-model="sp.name">
</td>

<td>
<input v-model="sp.ip">
</td>

<td>
<input v-model="sp.address">
</td>

<td>
<input v-model="sp.lat">
</td>

<td>
<input v-model="sp.lng">
</td>

<td>
<button @click="saveSpeaker(sp)">
Save
</button>
</td>

<td>
<button @click="testSpeaker(sp)">
TEST
</button>
</td>

<td>
<button @click="openMap(sp)">
MAP
</button>
</td>

</tr>

</table>

<h3>Add Speaker</h3>

<input v-model="newSpeakerName" placeholder="name">
<input v-model="newSpeakerIP" placeholder="ip">
<input v-model="newAddress" placeholder="address">

<button @click="openMapNew">
MAP
</button>

<button @click="addSpeaker">
ADD
</button>

<!-- MAP -->
<MapPopup
  v-if="showMap"
  :address="mapAddress"
  :lat="mapLat"
  :lng="mapLng"
  @select="onMapSelect"
  @close="showMap=false"
/>


</div>
</template>

<style scoped>

.view-root{
  min-height: calc(100vh - 60px);
  background:#202020;
  color:white;
  padding:20px;
}

.settings{
padding:20px;
color:#ddd;
}

table{
width:100%;
border-collapse:collapse;
}

td,th{
border:1px solid #444;
padding:6px;
}

input{
padding:4px;
background:#222;
color:white;
border:1px solid #555;
}

button{
padding:6px 10px;
background:#333;
color:white;
border:none;
cursor:pointer;
}

.add{
margin-top:20px;
display:flex;
gap:10px;
flex-wrap:wrap;
}
.map-popup{
position:fixed;
left:0;
top:0;
width:100%;
height:100%;
background:rgba(0,0,0,0.5);
display:flex;
align-items:center;
justify-content:center;
z-index:1000;
}

.map-box{
width:900px;
height:600px;
background:white;
display:flex;
flex-direction:column;
}
.map-window{
  width:600px;
  height:400px;
  display:flex;
  flex-direction:column;
}

#pickmap{
  flex:1;
}


</style>