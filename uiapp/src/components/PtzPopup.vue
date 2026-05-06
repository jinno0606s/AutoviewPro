<script setup>
// PTZコントロール用のポップアップコンポーネント
import { ref, onMounted, nextTick } from "vue"

const emit = defineEmits(["close"])
const popupLeft = ref(200)
const popupTop = ref(100)

const props = defineProps({
  camera:Object
})

function ptz(cmd){

 fetch(`/api/ptz/${props.camera.id}/${cmd}`)

}

</script>


<template>

<div class="ptz-overlay">

<div class="ptz-window">

<div class="ptz-title">

PTZ Control : {{camera.name}}

<button @click="emit('close')">
Close
</button>

</div>


<div class="ptz-pad">

<button @click="ptz('up')">▲</button>

<div class="mid">

<button @click="ptz('left')">◀</button>

<button @click="ptz('home')">●</button>

<button @click="ptz('right')">▶</button>

</div>

<button @click="ptz('down')">▼</button>

</div>

</div>

</div>

</template>


<style scoped>

.ptz-overlay{
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

.ptz-window{
width:300px;
background:white;
border-radius:6px;
padding:20px;
}

.ptz-title{
display:flex;
justify-content:space-between;
margin-bottom:10px;
}

.ptz-pad{
display:flex;
flex-direction:column;
align-items:center;
gap:10px;
}

.mid{
display:flex;
gap:10px;
}

button{
width:60px;
height:60px;
font-size:20px;
}

</style>