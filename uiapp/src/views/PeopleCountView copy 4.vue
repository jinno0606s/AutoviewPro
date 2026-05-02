<template>
  <div class="page">
    <h2>人数カウント</h2>

    <div class="filters">
      <label>カメラ:</label>
      <select v-model="selectedCam">
        <option value="">すべて</option>
        <option v-for="cam in cameras" :key="cam" :value="cam">
          {{ cam }}
        </option>
      </select>

      <button @click="loadData">更新</button>
    </div>


    <div class="filters">
      <label>
        開始
        <input type="datetime-local" v-model="from" />
      </label>

      <label>
        終了
        <input type="datetime-local" v-model="to" />
      </label>

      <!-- ★ ここに追加 -->
      <label>
        集計単位
        <select v-model="interval">
          <option value="10m">10分</option>
          <option value="1h">1時間</option>
          <option value="1d">1日</option>
        </select>
      </label>

      <button @click="searchReport">集計</button>
      <button @click="exportSummaryCsv">CSV出力（集計）</button>
      <button @click="exportTimeseriesCsv">CSV出力（時系列）</button>
    </div>


     <table class="report-table">
      <thead>
        <tr>
          <th>種類</th>
          <th>IN</th>
          <th>OUT</th>
          <th>TOTAL</th>
          <th style="background:#eef">現在（AREA）</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="(d, type) in summary" :key="type">
          <td>{{ type }}</td>
          <td>{{ d.IN }}</td>
          <td>{{ d.OUT }}</td>
          <td>{{ d.IN + d.OUT }}</td>

          <!-- ★ リアルタイムAREA -->
          <td style="font-weight:bold; color:#1976d2">
            {{ realtime.AREA[type] ?? 0 }}
          </td>
        </tr>
      </tbody>
    </table>

    <h3>時間帯別集計</h3>

    <table class="report-table">
      <thead>
        <tr>
          <th>時間</th>
          <th>human</th>
          <th>car</th>
          <th>bike</th>
          <th>bus</th>
          <th>truck</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="row in graphData" :key="row.time">
          <td>{{ new Date(row.time).toLocaleString() }}</td>
          <td>{{ row.human || 0 }}</td>
          <td>{{ row.car || 0 }}</td>
          <td>{{ row.bike || 0 }}</td>
          <td>{{ row.bus || 0 }}</td>
          <td>{{ row.truck || 0 }}</td>
        </tr>
      </tbody>
    </table>


  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue"
import Chart from "chart.js/auto"

const graphData = ref([])
const from = ref("")
const to = ref("")
const summary = ref({})
const interval = ref("10m")

const realtime = reactive({
  IN: 0,
  OUT: 0,
  AREA: {
    human: 0,
    car: 0,
    bike: 0,
    bus: 0,
    truck: 0,
    othervehicle: 0
  }
})

const lastAreaTs = {}
const cameras = ref([])
const selectedCam = ref("")

let chart = null


async function searchReport() {
/*
  const res = await fetch(
    `/api/people-timeseries?from=${from.value}&to=${to.value}&interval=${interval.value}`
  )
*/
 const res = await fetch(
  `/api/people-timeseries?from=${from.value}&to=${to.value}&interval=${interval.value}&camera=${selectedCam.value}`
)
  const json = await res.json()

  graphData.value = json.data || []

  await nextTick()

  renderChart()
}

/*
async function searchReport() {
  const res = await fetch(
    `/api/people-timeseries?from=${from.value}&to=${to.value}`
  )
  const json = await res.json()

  graphData.value = json.data || []

  renderChart()
}
*/
function exportTimeseriesCsv() {
  const url = `/api/people-timeseries-csv?from=${from.value}&to=${to.value}&interval=${interval.value}`
  window.open(url)
}

function renderChart() {

  if (chart) {
    chart.destroy()
  }

  const ctx = document.getElementById("chart")
  if (!ctx) return

  const safeData = graphData.value.filter(g => {
    const d = new Date(g.time)
    return !isNaN(d.getTime())
  })

  console.log("safeData:", safeData)

  if (!safeData.length) return

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: safeData.map(g =>
        new Date(g.time).toLocaleTimeString()
      ),

      datasets: [
        {
          label: "human",
          data: safeData.map(g => Number(g.human || 0))
        },
        {
          label: "car",
          data: safeData.map(g => Number(g.car || 0))
        },
        {
          label: "bike",
          data: safeData.map(g => Number(g.bike || 0))
        }
      ]
    },
    options: {
      responsive: true
    }
  })
}

/*
function renderChart() {

  if (chart) {
    chart.destroy()
  }

  const ctx = document.getElementById("chart")

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: graphData.value.map(g => g.time),

      datasets: [
        {
          label: "human IN",
          data: graphData.value.map(g => g.human_in)
        },
        {
          label: "human OUT",
          data: graphData.value.map(g => g.human_out)
        },
        {
          label: "car IN",
          data: graphData.value.map(g => g.car_in)
        },
        {
          label: "car OUT",
          data: graphData.value.map(g => g.car_out)
        }
      ]
    },
    options: {
      responsive: true
    }
  })
}

*/

// =====================
// API取得
// =====================
async function loadData() {
  let url = "/api/people-summary"

  if (selectedCam.value) {
    url += `?camera=${selectedCam.value}`
  }

  const res = await fetch(url)
  const json = await res.json()

  summary.value = json.summary || {}

  // カメラ一覧抽出（簡易）
  if (json.cameras) {
    cameras.value = json.cameras
  }
}

// =====================
// WebSocket
// =====================
function initWS() {
  const ws = new WebSocket(`ws://${location.hostname}:8090`)

  ws.onopen = () => {
    console.log("WS CONNECTED")
  }

  ws.onmessage = (ev) => {
    const e = JSON.parse(ev.data)

    const mode = String(e.mode || "").toLowerCase()
    const type = String(e.type || "").toLowerCase()

    // ===== CROSS =====
    if (mode === "cross") {
      const dir = String(e.direction || "").toUpperCase()
      if (dir === "OUT") realtime.OUT++
      else realtime.IN++
    }

    // ===== AREA（リアルタイム）=====
    if (mode === "area") {
      const ts = Number(e.ts)

      if (!lastAreaTs[type] || lastAreaTs[type] < ts) {
        realtime.AREA[type] = Number(e.value || 0)
        lastAreaTs[type] = ts
      }
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