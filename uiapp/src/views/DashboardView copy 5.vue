<script setup>

import { ref,onMounted } from "vue"
import QRCode from "qrcode"
import EventPanel from "../components/EventPanel.vue"

const cameras = ref([])
const seconds = ref(10)
const qr = ref("")

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


async function load(){

 try{

  if(window.autoview){

   // Electron
   cameras.value =
  await api.getCameras()

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

})


</script>


<template>

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

<EventPanel />

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

.right{
background:#111;
color:white;
overflow:auto;
}

@media (max-width:900px){

.dashboard{
grid-template-columns:1fr;
}

.right{
margin-top:20px;
}

}

</style>