// DashboardView.vue
<script setup>
import { ref,onMounted } from "vue"
import QRCode from "qrcode"
import EventPanel from "../components/EventPanel.vue"
import api from "../api/api.js"

const cameras = ref([])
const seconds = ref(10)
const qr = ref("")
const selectedCamId = ref(1)
//const mode = ref(window.autoview ? "electron" : "browser")
const peopleCounts = ref({})
const events = ref([])

const apiUrl =
 window.autoview?.apiUrl ||
 window.location.origin

 
const baseUrl =
 window.autoview?.apiUrl ||
 window.location.origin

const pcUrl =
 baseUrl + "/"

const mobileUrl =
 baseUrl + "/mobile"

const refreshKey = ref(Date.now())
// event switch
setInterval(() => {
  refreshKey.value = Date.now()
}, 2000)

/*
 setInterval(async () => {
  const res = await fetch("/api/events")
  events.value = await res.json()
}, 2000)
*/
async function load(){

 try{

  if(window.autoview){

   // Electron
   cameras.value =
   await window.autoview.getCameras()

  }else{

   // Browser
   const r =
   await fetch("/api/cameras")

   cameras.value =
   await r.json()

  }

 }catch(e){

  console.log("load cameras error",e)
  cameras.value=[]

 }

}
function layout(n){

 if(window.autoview){

  window.autoview.startLayout({
   count:n,
   seconds:Number(seconds.value)
  })

 }else{

  fetch("/api/layout/"+n)

 }

}

function show(cam){
  selectedCamId.value = cam.id

  if(window.autoview){
    window.autoview.startLiveTest({
      url: cam.rtsp_url,
      name: cam.name
    })
  }
}

function stop(){

 if(window.autoview){

  window.autoview.stopStream()

 }else{

  fetch("/api/stop")

 }

}


onMounted(async()=>{

  await load()

  QRCode.toDataURL(mobileUrl,(err,url)=>{
    qr.value = url
  })

  setInterval(async () => {

      const res = await api.getPeople()
      console.log("API RESULT =", res)

      peopleCounts.value = res

    }, 2000)

})


</script>


<template>
  <!--　画面切り替え  -->
<div class="panel">
  <button @click="mode='electron'">🖥 NUC（高画質）</button>
  <button @click="mode='browser'">🌐 ブラウザ（軽量）</button>
    MODE: {{ mode }}
    CAM: {{ selectedCamId }}
</div>

<div class="dashboard">

<div class="left">

<h1>AutoViewPro</h1>

<!-- Layout -->

<div class="panel">

<h2>Layout</h2>

<div class="layout">

<button @click="layout(1)">1</button>
<button @click="layout(4)">4</button>
<button @click="layout(9)">9</button>
<button @click="layout(12)">12</button>

</div>

<div class="sequence">

Sequence sec

<input type="number" v-model="seconds" min="1">

</div>

</div>


<!-- Cameras -->

<div class="panel">

<h2>Cameras</h2>

<div class="cams">

<button
v-for="cam in cameras"
:key="cam.id"
@click="show(cam)"
>
{{cam.name}}
</button>

</div>

</div>


<!-- STOP -->

<div class="panel stop">

<button @click="stop">
STOP
</button>

</div>


<!-- Web Access -->

<div class="panel">

<h2>Web Access</h2>

<p>PC UI</p>
<a :href="pcUrl" target="_blank">{{pcUrl}}</a>

<p>Mobile UI</p>
<a :href="mobileUrl" target="_blank">{{mobileUrl}}</a>

<br>

<img :src="qr" width="180">

</div>


</div>


<div class="right">
  <div class="event-panel">
    <div v-for="e in events" :key="e.ts">
      🚨 CAM {{ e.camId }} : {{ e.count }}人
    </div>
  </div>

 <div class="cam-box">

  <div class="electron-view">
    🖥 NUCで映像再生中
  </div>

  <div class="count-current">
    👤 {{ peopleCounts[String(selectedCamId)] ?? '-' }}
  </div>

</div>

</div>


</div>

</template>



<style scoped>
body{
margin:0;
background:#202020;
color:white;
font-family:sans-serif;
}

.dashboard{
display:grid;
grid-template-columns: 1fr 420px;
gap:20px;
height:100vh;
padding:20px;

background:#202020;
color:white;
}

.left{
overflow:auto;
}

.panel{
margin-bottom:25px;
padding:12px;
background:#2e2e2e;
border-radius:6px;
border:1px solid #444;
}

.layout button{
margin-right:10px;
padding:10px 20px;
background:#444;
color:white;
border:none;
}

.sequence{
margin-top:10px;
}

.sequence input{
width:70px;
margin-left:10px;
}

.cams{
display:grid;
grid-template-columns:repeat(4,1fr);
gap:10px;
}

.cams button{
padding:12px;
background:#222;
color:#fff;
border:1px solid #555;
border-radius:4px;
}


.stop button{
background:red;
color:white;
padding:12px 30px;
}

.right {
  position: relative;
  width: 100%;
  height: 100%;
  background: black;
}

.electron-view {
  width: 100%;
  height: 100%;
}

.overlay {
  position: absolute;
  top: 10px;
  left: 10px;
  color: #0f0;
  font-size: 12px;
}
.cam-box{
  position:relative;
  width:100%;
  height:100%;
}
.cam-box img{
  width:100%;
  height:100%;
  object-fit:contain;
  display:block;
}
.people-overlay{
  position: absolute;
  bottom: 10px;
  right: 10px;

  background: rgba(0,0,0,0.6);
  padding: 6px 10px;
  border-radius: 6px;

  font-size: 18px;
  color: #00ff88;
  font-weight: bold;
}

.count-debug{
  position:absolute;
  top:10px;
  left:10px;
  z-index:10;
  background:red;
  color:white;
  padding:5px;
  font-size:12px;
}

.count-current{
  position:absolute;
  bottom:10px;
  left:10px;
  z-index:10;
  background:black;
  color:white;
  padding:8px;
  font-size:16px;
}

@media (max-width:900px){

.dashboard{
grid-template-columns:1fr;
}

}

</style>