<script setup>

import { ref,onMounted } from "vue"
import QRCode from "qrcode"
import EventPanel from "../components/EventPanel.vue"

const cameras = ref([])
const seconds = ref(10)
const qr = ref("")

const apiUrl = window.autoview?.apiUrl || "http://localhost:8080"

async function load(){

 cameras.value = await window.autoview.getCameras()

}

function layout(n){

 window.autoview.startLayout({
   count:n,
   seconds:Number(seconds.value)
 })

}

function show(cam){

 window.autoview.startLiveTest({
   url: cam.rtsp_url,
   name: cam.name
 })

}

function stop(){

 window.autoview.stopStream()

}

onMounted(async()=>{

 await load()

 QRCode.toDataURL(apiUrl,(err,url)=>{
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

<input
type="number"
v-model="seconds"
min="1"
/>

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


<!-- QR -->

<div class="panel">

<h2>Mobile Control</h2>

<p>{{apiUrl}}</p>

<img :src="qr" width="180">

</div>

</div>


<div class="right">

<EventPanel />

</div>

</div>

</template>


<style scoped>

.dashboard{
display:grid;
grid-template-columns:1fr 420px;
height:100vh;
padding:20px;
font-family:sans-serif;
}

.left{
overflow:auto;
}

.panel{
margin-bottom:25px;
}

.layout button{
margin-right:10px;
padding:10px 20px;
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
background:#444;
color:white;
border:none;
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