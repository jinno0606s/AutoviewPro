<script setup>
import { ref, onMounted } from 'vue'

const layouts = [1,4,9,12]
const selectedLayout = ref(1)
const cameras = ref([])
const slots = ref([])

function buildSlots(count = selectedLayout.value) {
  slots.value = Array.from({ length: count }, (_, i) => ({
    index: i,
    cameraId: null
  }))
}

// ====== 起動時 ======
onMounted(async () => {

  // ① まず必ずUIを作る（白画面防止）
  buildSlots()

  // ② カメラ取得（失敗しても止めない）
  try {
    cameras.value = await window.autoview.getCameras() || []
  } catch (e) {
    console.log("getCameras error:", e)
  }

  // ③ レイアウト取得（配列形式前提）
  try {
    const saved = await window.autoview.getLayout(selectedLayout.value)

    if (Array.isArray(saved)) {
      slots.value = saved.map((camId, i) => ({
        index: i,
        cameraId: camId
      }))
    }

  } catch (e) {
    console.log("getLayout error:", e)
  }

})

// ====== レイアウト切替 ======
async function changeLayout(n) {

  selectedLayout.value = n
  buildSlots(n)   // 先に描画

  try {
    const saved = await window.autoview.getLayout(n)

    if (Array.isArray(saved)) {
      slots.value = saved.map((camId, i) => ({
        index: i,
        cameraId: camId
      }))
    }

  } catch (e) {
    console.log("changeLayout error:", e)
  }
}

// ====== 保存 ======
async function saveLayout() {
  try {
    const payload = {
      count: selectedLayout.value,
      slots: slots.value.map(s => ({
        index: s.index,
        cameraId: s.cameraId
      }))
    }

    await window.autoview.saveLayout(payload)
    alert("Saved")

  } catch (e) {
    console.log("saveLayout error:", e)
  }
}


// ====== テスト ======
async function testLayout() {
  try {
/*
    const payload = {
      count: selectedLayout.value,
      slots: slots.value.map(s => ({
        index: s.index,
        cameraId: s.cameraId
      }))
    }
*/
    await window.autoview.startLayout({
      count: selectedLayout.value
    })

    // await window.autoview.startLayout(payload)

  } catch (e) {
    console.log("testLayout error:", e)
  }
}

async function stopAll() {
  try {
    window.autoview.stopStream()
  } catch {}
}

/* ====== 強制テスト ======
async function simpleTest() {

  const payload = {
    count: 4,
    slots: [
      { index:0, cameraId:1 },
      { index:1, cameraId:2 },
      { index:2, cameraId:3 },
      { index:3, cameraId:null }
    ]
  }

  await window.autoview.startLayout(payload)
}
*/
</script>


<template>
  <div class="view-root">
    <h2>Layout Settings</h2>

    <div style="margin-bottom:12px;">
      <button v-for="l in layouts" :key="l" @click="changeLayout(l)" style="margin-right:8px;">
        {{ l }} Layout
      </button>
    </div>

    <div v-for="slot in slots" :key="slot.index" style="margin:8px 0; border:1px solid #ccc; padding:8px;">
      <div>Slot {{ slot.index + 1 }}</div>
      <select v-model="slot.cameraId">
        <!-- <option :value="null">Select Camera</option> -->
        <option 
          v-for="cam in cameras.filter(c => c.enabled === 1)" 
          :key="cam.id" 
          :value="cam.id"
        >
          Camera {{ cam.id }}
        </option>
      </select>
    </div>

    <div style="margin-top:16px;">
      <button @click="saveLayout">SAVE</button>
      <button @click="testLayout" style="margin-left:8px;">LAYOUT TEST</button> 
      <button @click="stopAll" style="margin-left:8px;">STOP</button>

      <!-- <button @click="simpleTest">SIMPLE TEST</button> -->
    </div>
  </div>
</template>

<style scoped>
.view-root{
  min-height: calc(100vh - 60px);
  background:#202020;
  color:white;
  padding:20px;
}

</style>