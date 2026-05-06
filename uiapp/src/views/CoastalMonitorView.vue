<template>
  <div class="page">

    <h2>海岸監視ダッシュボード</h2>

    <!-- 状態カード -->
    <div class="status-bar">
      <div class="card" :class="status">
        <h2>{{ statusLabel }}</h2>
      </div>
    </div>

    <!-- カメラ一覧 -->
    <div class="camera-list">
      <h3>カメラ一覧</h3>

      <div class="grid">


        <div v-for="cam in cameras" :key="cam.id" class="cam-box">

          <div class="title">{{ cam.name }}</div>

          <img
            :src="`/snapshot/${cam.id}?t=${tick}`"
            @click="selectedCam = cam"
          />

        </div>


      </div>
    </div>
 
<!--  
     <template v-if="cam.rtsp_url">

        <img
          :src="`/snapshot/${cam.id}?t=${tick}`"
          @click="selectedCam = cam"
        />

      </template>
-->

    <div v-for="cam in cameras" :key="cam.id" class="cam-box">

      <div class="title">{{ cam.name }}</div>

      <!-- ✔ ここで分岐 -->
      <template v-if="cam.rtsp_url">

        <img
          v-if="cam.rtsp_url && cam.rtsp_url !== ''"
          :src="`/snapshot/${cam.id}?t=${tick}`"
        />

      </template>

      <template v-else>

        <div class="noimg">
          NO SIGNAL
        </div>

      </template>

    </div>

    
    <!-- 放送 -->
    <div class="broadcast">
      <h3>警告放送</h3>

      <button class="btn caution" @click="sendBroadcast('注意')">注意</button>
      <button class="btn warning" @click="sendBroadcast('警戒')">警戒</button>
      <button class="btn evacuation" @click="sendBroadcast('避難')">避難</button>

    </div>

  </div>
</template>
<script setup>
import { ref, onMounted, computed } from "vue"
import api from "../api/api"
// import Hls from "hls.js"

const cameras = ref([])
const status = ref("normal")
/*
const props = defineProps({
  camId: Number
})
const video = ref(null)
*/
const dummy = "https://via.placeholder.com/320x180"
const selectedCam = ref(null)

// 状態ラベル
const statusLabel = computed(() => {
  return {
    normal: "通常",
    caution: "注意",
    warning: "警戒",
    evacuation: "避難"
  }[status.value]
})
const tick = ref(Date.now())

setInterval(() => {
  tick.value = Date.now()
}, 1000)

// カメラ取得
async function loadCameras() {
  try {
    const res = await fetch("/api/cameras")
    const data = await res.json()

    cameras.value = data
  } catch (e) {
    console.error("camera load error", e)
  }
}
// 放送
async function sendBroadcast(type) {

  status.value = type === "注意"
    ? "caution"
    : type === "警戒"
    ? "warning"
    : "evacuation"

  try {
    await api.post("/api/coastal/broadcast", {
      type
    })
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  loadCameras()
/*
  const url = `/hls/hls/${props.camId}/index.m3u8`

  if (Hls.isSupported()) {

    const hls = new Hls({
      lowLatencyMode: true
    })

    hls.loadSource(url)
    hls.attachMedia(video.value)

  } else {
    video.value.src = url
  }
  */
})

</script>

<style scoped>

.page {
  padding: 20px;
  background: #f5f7fa;
  color: #222;
}

.cam-box {
  border-radius: 10px;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* 状態 */
.status-bar {
  margin-bottom: 20px;
}

.card {
  font-size: 28px;
  font-weight: bold;
}

.normal { background: #4caf50; }
.caution { background: #ff9800; }
.warning { background: #f44336; }
.evacuation { background: #9c27b0; }

/* カメラ */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 300px);
  gap: 10px;
}

.cam-box img {
  width: 100%;
}

/* 放送 */
.broadcast {
  margin-top: 20px;
}

button {
  margin-right: 10px;
  padding: 10px;
}

</style>