<template>
  <div class="layout">

    <!-- 左：設定 -->
    <div class="left panel">

      <h3>📡 カメラ制御</h3>

      <select v-model="cam.id" @change="loadCamera">
        <option v-for="c in cameras" :key="c.id" :value="c.id">
          {{ c.name }}
        </option>
      </select>

      <label>
        <input type="checkbox" v-model="cam.timelapse_enabled">
        有効化
      </label>

      <div>間隔 <input type="number" v-model.number="cam.tl_interval"></div>

      <div>
        開始 <input type="number" v-model.number="cam.tl_start_hour">
        終了 <input type="number" v-model.number="cam.tl_end_hour">
      </div>

      <div>
        <label v-for="d in days" :key="d.value">
          <input type="checkbox" :value="d.value" v-model="selectedDays">
          {{ d.label }}
        </label>
      </div>

      <div>
        FPS <input type="number" v-model.number="cam.tl_fps">
        画質 <input type="number" v-model.number="cam.tl_quality">
      </div>
<!--  
      <div>
        <button @click="startTL">▶</button>
        <button @click="stopTL">■</button>
        {{ isRunning ? "稼働中" : "停止" }}
      </div>
-->
      <button @click="save">💾 保存</button>
      <button @click="run">📸 テスト撮影</button>

      <h3>🎛 カメラ設定</h3>

      <div>彩度 <input type="range" v-model="cam.saturation"></div>
      <div>コントラスト <input type="range" v-model="cam.contrast"></div>
      <div>輝度 <input type="range" v-model="cam.brightness"></div>
      <div>シャープネス <input type="range" v-model="cam.sharpness"></div>
      
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


      <button @click="saveCameraSettings">💾 保存</button>

      <h3>⏱ タイムラプス制御</h3>

        <button @click="startTL">▶ スタート</button>
        <button @click="stopTL">⏹ 停止</button>

        <div>
          状態: {{ isRunning ? "稼働中" : "停止" }}
        </div>
        
        <!-- LOG  -->
        <div style="max-height:150px;overflow:auto;font-size:12px">
          <div v-for="l in logs" :key="l.time">
            [{{ new Date(l.time).toLocaleTimeString() }}]
            {{ l.type }} : {{ l.msg }}
          </div>
        </div>
      </div>
      <hr>

      <!-- 素材 -->
      <h3>🖼 素材</h3>

      <input type="datetime-local" v-model="from">
      <input type="datetime-local" v-model="to">

      <button @click="loadFiles">📂 読込</button>

      FPS:
      <input type="number" v-model="fps">

      <div class="thumbs">
        <div v-for="f in files"
             :key="f.name"
             class="thumb"
             :class="{ selected: selected.includes(f.name) }">

          <img :src="f.url" @click="toggleSelect(f.name)">
        </div>
      </div>

      <button @click="deleteFiles">🗑削除</button>

    </div>

    <!-- 右：映像 -->
    <div class="right">

      <!-- 切替 -->
      <div class="toolbar">
        <button @click="mode='live'">🎬 ライブ</button>
        <button @click="mode='video'">🎞 動画</button>
        <button @click="fullscreen">⛶ 全画面</button>
      </div>

      <!-- 表示 -->
      <div class="viewer">

        <!-- ライブ -->
        <img v-if="mode==='live'" :src="liveUrl" />

        <!-- 動画 -->
        <video v-if="mode==='video'" :src="videoUrl" controls />

      </div>

      <!-- 下パネル -->
      <div class="bottom panel">
        
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

        <div v-if="videoUrl">
          <a :href="videoUrl" download>⬇ ダウンロード</a>
        </div>

        <!-- 履歴 -->
        <h4>履歴</h4>

        <div v-for="v in videos" :key="v.name"
             :class="{ active: videoUrl === v.url }">

          ▶ {{ formatName(v.name) }}

          <button @click="videoUrl = v.url; mode='video'">▶</button>
          <a :href="v.url" download>⬇</a>
          <button @click="deleteVideo(v.name)">🗑</button>
          
          <select v-model="speed">
            <option :value="1">等倍</option>
            <option :value="2">2倍</option>
            <option :value="4">4倍</option>
            <option :value="8">8倍</option>
          </select>

        </div>

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
const speed = ref(1)

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

const mode = ref("live")

// プレビューしたら自動切替
async function preview(){

  // const res = await fetch(`/api/timelapse/preview?...`)
  const res = await fetch(
    `/api/timelapse/preview?camera_id=${cameraId.value}&from=${from.value}&to=${to.value}&fps=${fps.value * speed.value}`
  )
  const data = await res.json()

  if(!data.ok){
    alert("動画生成失敗")
    return
  }

  videoUrl.value = data.url + "?t=" + Date.now()
  mode.value = "video"
}

// 古いファイルの削除
const limit = Date.now() - (3 * 24 * 60 * 60 * 1000)

const isRunning = ref(false)
const logs = ref([])

async function loadStatus(){
  const res = await fetch("/api/timelapse/status")
  const data = await res.json()
  logs.value = data.logs
  isRunning.value = data.running
}
//log
async function loadLogs(){
  const res = await fetch("/api/timelapse/logs")
  const data = await res.json()
  console.log("STATUS:", data.running)

  logs.value = data.logs
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
   loadStatus()
   loadLogs()
   setInterval(loadStatus, 2000)
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

// 全画面表示
function fullscreen(){
  const el = document.querySelector(".viewer")

  if(el.requestFullscreen){
    el.requestFullscreen()
  }
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

/* 🎬 プレビュー生成
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
*/

</script>
<style scoped>

.layout {
  display: grid;
  grid-template-columns: 350px 1fr;
  height: 100vh;
}

/* 左 */
.left {
  overflow-y: auto;
}

/* 右 */
.right {
  display: flex;
  flex-direction: column;
}

/* 上（映像） */
.viewer {
  flex: 1;
  background: black;
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 250px);
}

.viewer video,
.viewer img {
  width: 100%;
  height: 100%;
  object-fit: contain; /* ← 横長問題解決 */
}

/* 下 */
.bottom {
  height: 200px;
  overflow-y: auto;
}

/* 共通 */
.panel {
  border: 1px solid #ccc;
  padding: 10px;
  background: #111;
  color: #fff;
}

.toolbar {
  padding: 10px;
  background: #222;
}

/* サムネ */
.thumbs {
  display: flex;
  flex-wrap: wrap;
}

.thumb {
  width: 100px;
  height: 70px;
  margin: 2px;
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
