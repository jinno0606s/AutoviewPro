<script setup>

import { ref,onMounted } from "vue"

const speakers = ref([])

const newName = ref("")
const newIp = ref("")
const newRtp = ref("")
const newAddress = ref("")
const newLat = ref("")
const newLng = ref("")

const busy = ref(false)
const testingId = ref(null)

async function loadSpeakers(){

 speakers.value =
  await window.autoview.getSpeakers()

}

onMounted(loadSpeakers)

function normalizeRtpIp(value) {
  return String(value || "")
    .replace(/^rtp:\/\//, "")
    .trim()
}

async function addSpeaker(){

  await window.autoview.saveSpeaker({
    name: newName.value,
    ip: newIp.value,
    rtp_ip: normalizeRtpIp(newRtp.value),
    address: newAddress.value
  })

  await loadSpeakers()
}



async function saveSpeaker(sp){

  const payload = {
    id: sp.id,
    name: sp.name,
    ip: sp.ip || "",
    rtp_ip: normalizeRtpIp(sp.rtp_ip),
    address: sp.address || "",
    lat: sp.lat ?? null,
    lng: sp.lng ?? null,
    enabled: typeof sp.enabled === "number" ? sp.enabled : 1
  }

  console.log("saveSpeaker payload:", payload)

  await window.autoview.updateSpeaker(payload)
  await loadSpeakers()
}
/*
async function testSpeaker(sp){

  if (busy.value) return

  busy.value = true
  testingId.value = sp.id

  try {
    const rtpIp = normalizeRtpIp(sp.rtp_ip)

    console.log("TEST speaker id=", sp.id, "rtp_ip=", rtpIp)

    const res = await window.autoview.speakerTest({
      rtp_ip: rtpIp
    })

    console.log("speakerTest result:", res)
  } catch (err) {
    console.error("speakerTest error:", err)
  } finally {
    setTimeout(() => {
      busy.value = false
      testingId.value = null
    }, 1000)
  }
}
*/
async function testSpeaker(sp){

 if(busy.value) return

 busy.value = true
 testingId.value = sp.id

 await window.autoview.speakerTest({
   rtp_ip: sp.rtp_ip
 })

 setTimeout(()=>{
   busy.value = false
 },1000)

}


function openMap(sp){

 if(!sp.address){
   alert("address not set")
   return
 }

 const url =
 `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sp.address)}`

 window.open(url,"_blank")

}

</script>
<template>

<div class="settings">

<h2>Speaker Settings</h2>

<table>

<thead>
<tr>
<th>ID</th>
<th>Name</th>
<th>IP</th>
<th>RTP</th>
<th>Address</th>
<th>Status</th>
<th>Save</th>
<th>Test</th>
<th>MAP</th>
</tr>
</thead>

<tbody>

<tr v-for="sp in speakers" :key="sp.id">

<td>{{sp.id}}</td>

<td>
<input v-model="sp.name"/>
</td>

<td>
<input v-model="sp.ip" style="width:140px"/>
</td>

<td>
<input v-model="sp.rtp_ip" style="width:260px"/>
</td>

<td>
<input v-model="sp.address" style="width:200px"/>
</td>

<td>

<span
:style="{color:sp.enabled?'green':'red'}"
>

{{sp.enabled?'ENABLED':'DISABLED'}}

</span>

</td>

<td>

<button @click="saveSpeaker(sp)">
Save
</button>

</td>

<td>

<button
:disabled="busy"
@click="testSpeaker(sp)"
:style="{
background: testingId===sp.id?'#00aa00':'#444',
color:'white'
}"
>

▶ Test

</button>

</td>

<td>

<button @click="openMap(sp)">
MAP
</button>

</td>

</tr>

</tbody>

</table>


<h3>Add Speaker</h3>

<div class="add">

<input v-model="newName" placeholder="Speaker Name"/>

<input v-model="newIp" placeholder="Speaker IP"/>

<input v-model="newRtp" placeholder="rtp://239.x.x.x:5004" style="width:260px"/>

<input v-model="newAddress" placeholder="Address"/>

<button
:disabled="!newName || !newRtp"
@click="addSpeaker"
>
＋ Add Speaker
</button>

</div>

</div>

</template>
<style scoped>

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

</style>