<script setup>

import { onMounted, watch, nextTick } from "vue"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const props = defineProps({
  address:String,
  lat:Number,
  lng:Number
})

const emit = defineEmits(["select","close"])

let map = null
let marker = null


let dragging = false
let dragOffsetX = 0
let dragOffsetY = 0

function startDrag(e){
  dragging = true
  dragOffsetX = e.clientX - popupLeft.value
  dragOffsetY = e.clientY - popupTop.value

  window.addEventListener("mousemove", onDrag)
  window.addEventListener("mouseup", stopDrag)
}

function onDrag(e){
  if(!dragging) return
  popupLeft.value = e.clientX - dragOffsetX
  popupTop.value = e.clientY - dragOffsetY
}

function stopDrag(){
  dragging = false
  window.removeEventListener("mousemove", onDrag)
  window.removeEventListener("mouseup", stopDrag)
}

async function startMap(){

 await nextTick()

 let center = [
   Number(import.meta.env.VITE_MAP_CENTER_LNG),
   Number(import.meta.env.VITE_MAP_CENTER_LAT)
 ]

 // lat lng 優先
 if(props.lat && props.lng){

   center = [Number(props.lng),Number(props.lat)]

 }

 // 住所
 else if(props.address){

   try{

     const r =
     await window.autoview.geocodeAddress(props.address)

     if(r && r.ok){

       center=[Number(r.lng),Number(r.lat)]

     }

   }catch(e){

     console.log("geocode error",e)

   }

 }

map = new mapboxgl.Map({
  container: "popupmap",
  style: "mapbox://styles/mapbox/streets-v12",
  center,
  zoom: 14,
  dragPan: true,
  scrollZoom: true,
  boxZoom: true,
  doubleClickZoom: true,
  touchZoomRotate: true
})

 map.on("load",()=>{

   marker=new mapboxgl.Marker({color:"red"})
     .setLngLat(center)
     .addTo(map)

 })

 map.on("click",(e)=>{

   const lat=e.lngLat.lat
   const lng=e.lngLat.lng

   marker.setLngLat([lng,lat])

   emit("select",{lat,lng})

 })

}

onMounted(startMap)

</script>

<template>
<div class="map-overlay">
  <div
    class="map-window"
    :style="{ left: popupLeft + 'px', top: popupTop + 'px' }"
  >
    <div class="map-title" @mousedown="startDrag">
      MAP SELECT
      <button @click="$emit('close')">Close</button>
    </div>

    <div id="popupmap"></div>
  </div>
</div>
</template>

<style scoped>

.map-overlay{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,0.2);
  z-index:9999;
}

.map-window{
  position:absolute;
  width:800px;
  height:500px;
  background:white;
  display:flex;
  flex-direction:column;
  border-radius:6px;
  overflow:hidden;
  box-shadow:0 10px 30px rgba(0,0,0,0.3);
}

.map-title{
  padding:10px;
  background:#f0f0f0;
  display:flex;
  justify-content:space-between;
  align-items:center;
  cursor:move;
  user-select:none;
}

#popupmap{
  flex:1;
}


</style>