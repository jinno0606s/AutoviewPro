<template>
  <div class="page">
    <h2>人数カウント</h2>

    <div class="filters">
      <label>モード:</label>
      <select v-model="mode">
        <option value="cross">クロス</option>
        <option value="area">エリア</option>
      </select>

      <button @click="loadData">更新</button>
    </div>

    <!-- クロス -->
    <table v-if="mode === 'cross'" class="report-table">
      <thead>
        <tr>
          <th>種類</th>
          <th>IN</th>
          <th>OUT</th>
          <th>TOTAL</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(d, type) in crossData" :key="type">
          <td>{{ type }}</td>
          <td>{{ d.IN }}</td>
          <td>{{ d.OUT }}</td>
          <td>{{ d.IN + d.OUT }}</td>
        </tr>
      </tbody>
    </table>

    <!-- エリア -->
    <table v-if="mode === 'area'" class="report-table">
      <thead>
        <tr>
          <th>種類</th>
          <th>現在数</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(value, type) in areaData" :key="type">
          <td>{{ type }}</td>
          <td>{{ value }}</td>
        </tr>
      </tbody>
    </table>

    <!-- リアルタイム -->
    <div class="realtime-box">
      <div v-if="mode === 'cross'">
        IN: {{ realtime.IN }} / OUT: {{ realtime.OUT }}
      </div>

      <div v-if="mode === 'area'">
        更新中...
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue"

const mode = ref("cross")

const crossData = ref({})
const areaData = ref({})

const realtime = reactive({
  IN: 0,
  OUT: 0
})

// API取得
async function loadData() {
  if (mode.value === "cross") {
    const res = await fetch(`/api/people-summary?mode=cross`)
    const json = await res.json()
    crossData.value = json.summary || {}
  }

  if (mode.value === "area") {
    const res = await fetch(`/api/people-summary?mode=area`)
    const json = await res.json()
    areaData.value = json || {}
  }
}

// WebSocket
function initWS() {
  const ws = new WebSocket(`ws://${location.host}`)

  ws.onmessage = (ev) => {
    const e = JSON.parse(ev.data)

    if (e.mode === "cross") {
      if (e.direction === "IN") realtime.IN++
      if (e.direction === "OUT") realtime.OUT++
    }
  }
}

onMounted(() => {
  loadData()
  initWS()
})
</script>

<style scoped>
.page {
  padding: 20px;
  background: #fff;
  color: #222;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.report-table th {
  background: #eee;
}

.report-table td,
.report-table th {
  border: 1px solid #ccc;
  padding: 8px;
  text-align: center;
}

.filters {
  margin-bottom: 10px;
}

.realtime-box {
  margin-top: 20px;
  font-size: 18px;
}
</style>