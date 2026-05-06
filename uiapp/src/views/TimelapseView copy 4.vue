<template>
  <div class="dashboard">

    <!-- 左上 -->
    <div class="panel">
      <h3>📡 カメラ制御</h3>

      <!-- カメラ -->
      <select v-model="cam.id" @change="loadCamera">
        <option v-for="c in cameras" :key="c.id" :value="c.id">
          {{ c.name }}
        </option>
      </select>

      <!-- ON/OFF -->
      <label>
        <input type="checkbox" v-model="cam.timelapse_enabled">
        有効化
      </label>

      <!-- 間隔 -->
      <div>
        間隔 <input type="number" v-model.number="cam.tl_interval">
      </div>

      <!-- 時間 -->
      <div>
        開始 <input type="number" v-model.number="cam.tl_start_hour">
        終了 <input type="number" v-model.number="cam.tl_end_hour">
      </div>

      <!-- 曜日 -->
      <div>
        <label v-for="d in days" :key="d.value">
          <input type="checkbox" :value="d.value" v-model="selectedDays">
          {{ d.label }}
        </label>
      </div>

      <!-- FPS -->
      <div>
        FPS <input type="number" v-model.number="cam.tl_fps">
        画質 <input type="number" v-model.number="cam.tl_quality">
      </div>

      <!-- 操作 -->
      <div>
        <button @click="startTL">▶</button>
        <button @click="stopTL">■</button>
        <span>{{ isRunning ? "稼働中" : "停止" }}</span>
      </div>

      <button @click="save">💾 保存</button>
      <button @click="run">📸 テスト撮影</button>
    </div>

    <!-- 右上 -->
    <div class="panel">
      <h3>🎬 ライブ + カメラ設定</h3>

      <!-- ライブ -->
      <img :src="liveUrl" style="width:100%;margin-bottom:10px" />

      <!-- 画質調整 -->
      <div class="control">
        彩度 {{ cam.saturation }}
        <input type="range" min="0" max="100" v-model.number="cam.saturation" />
      </div>

      <div class="control">
        コントラスト {{ cam.contrast }}
        <input type="range" min="0" max="100" v-model.number="cam.contrast" />
      </div>

      <div class="control">
        輝度 {{ cam.brightness }}
        <input type="range" min="0" max="100" v-model.number="cam.brightness" />
      </div>

      <div class="control">
        シャープネス {{ cam.sharpness }}
        <input type="range" min="0" max="100" v-model.number="cam.sharpness" />
      </div>

      <!-- プルダウン -->
      <div>
        ホワイトバランス
        <select v-model="cam.white_balance">
          <option>auto</option>
          <option>outdoor</option>
          <option>indoor</option>
          <option>fluorescent1</option>
          <option>fluorescent2</option>
        </select>
      </div>

      <div>
        IRフィルタ
        <select v-model="cam.ir_cut">
          <option>auto</option>
          <option>on</option>
          <option>off</option>
        </select>
      </div>

      <div>
        露出
        <select v-model="cam.exposure">
          <option>auto</option>
          <option>50hz</option>
          <option>60hz</option>
        </select>
      </div>

      <!-- 解像度 -->
      <div>
        解像度
        <select v-model="cam.resolution">
          <option>4K</option>
          <option>FullHD</option>
        </select>
      </div>

      <!-- FPS -->
      <div>
        FPS
        <select v-model="cam.fps">
          <option v-for="n in 21" :key="n" :value="n-1">{{ n-1 }}</option>
        </select>
      </div>

      <!-- ビットレート -->
      <div>
        ビットレート制御
        <select v-model="cam.bitrate_mode">
          <option>avg</option>
          <option>max</option>
          <option>vbr</option>
        </select>

        <input type="number" v-model="cam.bitrate" placeholder="kbps" />
      </div>

      <!-- 保存 -->
      <button @click="saveCameraSettings">💾 カメラ設定保存</button>
    </div>

      
    <!-- 左下 -->
    <div class="panel">
      <h3>🖼 素材</h3>

      <!-- 期間 -->
      <input type="datetime-local" v-model="from">
      <input type="datetime-local" v-model="to">

      <button @click="loadFiles">📂 読込</button>

      <!-- FPS -->
      FPS:
      <input type="number" v-model="fps">

      <!-- サムネ -->
      <div class="grid">
        <div v-for="f in files"
            :key="f.name"
            class="thumb"
            :class="{ selected: selected.includes(f.name) }">

          <img :src="f.url" @click="toggleSelect(f.name)">
        </div>
      </div>

      <button @click="deleteFiles">🗑削除</button>
    </div>

    <!-- 右下 -->
    <div class="panel">
      <h3>🎬 タイムラプス</h3>

      <!-- 間隔 -->
      <div>
        保存間隔
        <select v-model="cam.tl_interval">
          <option :value="600">10分</option>
          <option :value="1800">30分</option>
          <option :value="3600">1時間</option>
          <option :value="10800">3時間</option>
          <option :value="21600">6時間</option>
        </select>
      </div>

      <!-- 生成 -->
      <button @click="preview">🎬 生成して再生</button>

      <!-- プレビュー -->
      <video
        v-if="videoUrl"
        :src="videoUrl"
        controls
        style="width:100%;margin-top:10px"
      />

      <!-- ダウンロード -->
      <div v-if="videoUrl">
        <a :href="videoUrl" download>⬇ ダウンロード</a>
      </div>

      <!-- 履歴 -->
      <h4>履歴</h4>

      <div v-for="v in videos" :key="v.name"
          :class="{ active: videoUrl === v.url }">

        ▶ {{ formatName(v.name) }}

        <button @click="videoUrl = v.url">▶</button>
        <a :href="v.url" download>⬇</a>
        <button @click="deleteVideo(v.name)">🗑</button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"

const baseUrl = "http://192.168.1.196:8080"

const cameras = ref([])
const cam = ref({})
const images = ref([])
const selectedDays = ref([])

const cameraId = ref(1)

const from = ref("")
const to = ref("")
const fps = ref(12)

const files = ref([])
const selected = ref([])
const videoUrl = ref("")

const days = [
  { label: "日", value: 0 },
  { label: "月", value: 1 },
  { label: "火", value: 2 },
  { label: "水", value: 3 },
  { label: "木", value: 4 },
  { label: "金", value: 5 },
  { label: "土", value: 6 }
]

const videos = ref([])

// 古いファイルの削除
const limit = Date.now() - (3 * 24 * 60 * 60 * 1000)

const isRunning = ref(false)

async function loadStatus(){
  const res = await fetch("/api/timelapse/status")
  const data = await res.json()
  isRunning.value = data.running
}

// 疑似ライブ実装
const liveUrl = ref("")

setInterval(()=>{
  liveUrl.value = `/api/timelapse/latest?camera_id=${cam.value.id}&t=${Date.now()}`
}, 1000)

// 生成動画一覧 読み込み
async function loadVideos(){
  const res = await fetch("/api/timelapse/videos")
  const data = await res.json()
  videos.value = data.files
}

onMounted(async ()=>{
  const res = await fetch(baseUrl + "/api/cameras")
  cameras.value = await res.json()
  
  if(cameras.value.length){
    cam.value = { ...cameras.value[0] }
    selectedDays.value = parseDays(cam.value.tl_days)
  }
   loadVideos()
})

// tiMLAPSE START
async function startTL(){
  await fetch("/api/timelapse/start",{ method:"POST" })
}

async function stopTL(){
  await fetch("/api/timelapse/stop",{ method:"POST" })
}
function parseDays(str){
  if(!str) return [0,1,2,3,4,5,6]
  return str.split(",").map(Number)
}

function loadCamera(){
  const c = cameras.value.find(x => x.id === cam.value.id)
  cam.value = { ...c }
  selectedDays.value = parseDays(cam.value.tl_days)
}

async function save(){

  const payload = {
    ...cam.value,
    tl_days: selectedDays.value.join(",")
  }

  await fetch(baseUrl + "/api/camera/update",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(payload)
  })

  alert("保存しました")
}

async function run(){

  const res = await fetch(baseUrl + "/api/timelapse/run",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ camera_id: cam.value.id })
  })

  const data = await res.json()

  console.log(data)

  if(data.length && data[0].meta){
    images.value.unshift(data[0].meta.file)
  }
}
// 📅 ファイル名を日付表示
function formatName(name){
  // camera_1_2026-03-22_18-45.mp4 → 2026/03/22 18:45
  const m = name.match(/(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2})/)
  if(!m) return name

  return `${m[1].replaceAll("-", "/")} ${m[2].replace("-", ":")}`
}
////////////////////////////////////////
async function loadFiles(){
  const url = `/api/timelapse/files?camera_id=${cameraId.value}&from=${new Date(from.value).getTime()}&to=${new Date(to.value).getTime()}`

  const res = await fetch(url)
  const data = await res.json()

  files.value = data.files || []
}

function toggleSelect(name){
  if(selected.value.includes(name)){
    selected.value = selected.value.filter(f => f !== name)
  }else{
    selected.value.push(name)
  }
}
// ファイル削除
async function deleteVideo(name){
  if(!confirm("削除しますか？")) return

  await fetch("/api/timelapse/video/delete",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ name })
  })

  await loadVideos()
}

// 🎬 プレビュー生成
async function preview(){
  const res = await fetch(
    `/api/timelapse/preview?camera_id=${cam.value.id}&from=${new Date(from.value).getTime()}&to=${new Date(to.value).getTime()}`
  )

  const data = await res.json()

  if(!data.ok){
    alert("動画生成失敗")
    return
  }

  videoUrl.value = data.url + "?t=" + Date.now()

  // 🔥 これ追加
  await loadVideos()
}

</script>

<style scoped>
.dashboard {
  display: grid;
  grid-template-columns: 1fr 2fr;
  grid-template-rows: 1fr 1fr;
  height: 100vh;
  gap: 10px;
}

.panel {
  border: 1px solid #ccc;
  padding: 10px;
  overflow: auto;
  background: #111;
  color: #fff;
}
/*  
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 100px);
  gap: 5px;
}
*/
.grid {
  display: grid;
  grid-template-columns: 300px 1fr;
  grid-template-rows: 1fr 300px;
  height: 100vh;
}
.thumb {
  width: 100px;
  height: 70px;
  overflow: hidden;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.selected {
  border: 2px solid red;
}

.active {
  background: #0af;
}
</style>