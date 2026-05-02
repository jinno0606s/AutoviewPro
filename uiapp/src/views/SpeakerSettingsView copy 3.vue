<script setup>

import { ref, onMounted } from "vue"
import  api  from "../api/api"

const speakers = ref([])

const newSpeakerName = ref("")
const newSpeakerIP = ref("")
const newAddress = ref("")
const newLat = ref("")
const newLng = ref("")

// ======================
// LOAD
// ======================
async function loadSpeakers(){

 try{

  speakers.value =
   await api.getSpeakers()

 }catch(e){

  console.log("load error",e)
  speakers.value=[]

 }

}

// ======================
// ADD
// ======================
async function addSpeaker(){

 try{

  await api.saveSpeaker({

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

 }catch(e){

  console.log("add error",e)

 }

}

// ======================
// SAVE
// ======================
async function saveSpeaker(sp){

 try{

  await api.updateSpeaker(sp)

  await loadSpeakers()

 }catch(e){

  console.log("save error",e)

 }

}

// ======================
// TEST
// ======================
let speaking = false

async function testSpeaker(sp){

 if(speaking) return

 speaking = true

 await api.speakerTest(sp)

 setTimeout(()=>{
   speaking = false
 },2000)

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
</tr>

<tr v-for="sp in speakers" :key="sp.id">

<td>{{sp.id}}</td>

<td><input v-model="sp.name"></td>
<td><input v-model="sp.ip"></td>
<td><input v-model="sp.address"></td>
<td><input v-model="sp.lat"></td>
<td><input v-model="sp.lng"></td>

<td>
<button @click="saveSpeaker(sp)">Save</button>
</td>

<td>
<button @click="testSpeaker(sp)">TEST</button>
</td>

</tr>

</table>

<h3>Add Speaker</h3>

<input v-model="newSpeakerName" placeholder="name">
<input v-model="newSpeakerIP" placeholder="ip">
<input v-model="newAddress" placeholder="address">

<button @click="addSpeaker">ADD</button>

</div>

</template>


<style scoped>

.view-root{
min-height: calc(100vh - 60px);
background:#202020;
color:white;
padding:20px;
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
background:#222;
color:white;
border:1px solid #555;
}

button{
background:#333;
color:white;
padding:6px 10px;
}

</style>