<!-- PeopleCountView.vue -->
<template>
  <div class="page">
    <div class="header">
      <div class="status">
        ● 更新中
      </div>
    </div>
        
    <div class="filters">
      <h2>集計方法</h2>
        <select v-model="mode">
          <option value="cross">クロス</option>
          <option value="area">エリア</option>
        </select>

    
      <label>
        開始
        <input type="datetime-local" v-model="from" />
      </label>

      <label>
        終了
        <input type="datetime-local" v-model="to" />
      </label>

      <button @click="searchReport">集計</button>
      <button @click="exportSummaryCsv">CSV出力（集計）</button>
      <button @click="exportTimeseriesCsv">CSV出力（時系列）</button>
    </div>

    
    <div class="realtime-box">
      IN: {{ realtimeCounts.IN }} / OUT: {{ realtimeCounts.OUT }}
    </div>

    <div style="color:yellow; background:black;">
      DEBUG: {{ JSON.stringify(realtimeCounts) }}
    </div>


<!--  
    <div style="font-size:24px">
      IN: {{ realtimeCounts.IN }} / OUT: {{ realtimeCounts.OUT }}
    </div>

    <div>
      DEBUG: {{ JSON.stringify(realtimeCounts) }}
    </div>
    -->
    <h3>リアルタイムグラフ</h3>
    <div class="chart-box">
      <canvas ref="chartRef" height="120"></canvas>
    </div>

    <h3>時系列</h3>

    <table>
      <thead>
        <tr>
          <th>時間</th>
          <th>human_in</th>
          <th>human_out</th>
          <th>car_in</th>
          <th>car_out</th>
          <th>bike_in</th>
          <th>bike_out</th>
          <th>bus_in</th>
          <th>bus_out</th>
          <th>truck_in</th>
          <th>truck_out</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="g in graphData" :key="g.time">
          <td>{{ g.time }}</td>
          <td>{{ g.human_in || 0 }}</td>
          <td>{{ g.human_out || 0 }}</td>
          <td>{{ g.car_in || 0 }}</td>
          <td>{{ g.car_out || 0 }}</td>
          <td>{{ g.bike_in || 0 }}</td>
          <td>{{ g.bike_out || 0 }}</td>
          <td>{{ g.bus_in || 0 }}</td>
          <td>{{ g.bus_out || 0 }}</td>
          <td>{{ g.truck_in || 0 }}</td>
          <td>{{ g.truck_out || 0 }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted,onUnmounted, onBeforeUnmount, watch } from "vue"
import Chart from "chart.js/auto"
import { reactive } from "vue"

const cameras = ref([])
const rows = ref([])
const camId = ref("")

const layout = ref(4)
const mqttCounts = ref({})
const refreshKey = ref(Date.now())

// 期間指定
const from = ref("")
const to = ref("")

// 集計結果
const summary = ref({
  human: { IN: 0, OUT: 0 },
  car: { IN: 0, OUT: 0 },
  bike: { IN: 0, OUT: 0 },
  bus: { IN: 0, OUT: 0 },
  truck: { IN: 0, OUT: 0 }
})

const graphData = ref([])
const chartRef = ref(null)
let chartInstance = null
let timer = null
let chart = null

const mode = ref("cross")
const scenarioInput = ref("1,2")
// エリア集計用
const realtimeCounts = reactive({
  IN: 0,
  OUT: 0
})

// グラフ初期化
function initChart() {

  const ctx = chartRef.value.getContext("2d")

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "human",
          data: []
        },
        {
          label: "car",
          data: []
        }
      ]
    },
    options: {
      animation: false,
      responsive: true
    }
  })
}
// グラフ更新
function updateChart() {

  if (!chart) return

  chart.data.labels = graphData.value.map(g => g.time)

  chart.data.datasets[0].data =
    graphData.value.map(g => g.human_in || 0)

  chart.data.datasets[1].data =
    graphData.value.map(g => g.car_in || 0)

  chart.update()
}
// グラフデータ変更で更新
watch(graphData, () => {
  updateChart()
})

// デフォルト期間（今日 09:00〜18:00）
function initRange() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")

  from.value = `${yyyy}-${mm}-${dd}T00:00`
  to.value = `${yyyy}-${mm}-${dd}T23:59`
}

// 集計取得
async function loadSummary() {
  try {
    const res = await fetch(
      `/api/people-summary?mode=${mode.value}&scenario=${scenarioInput.value}&from=${from.value}&to=${to.value}`
    )

    const data = await res.json()

    if (mode.value === "cross") {
      summary.value = data.summary
    } else {
      areaData.value = data
    }

  } catch (e) {
    console.log("loadSummary error", e)
  }
}


// グラフデータ取得
async function loadGraph(unit = "hour") {
  return

  try {
    const res = await fetch(
      `/api/events-agg-timeseries?from=${encodeURIComponent(from.value)}&to=${encodeURIComponent(to.value)}&unit=${unit}`
    )
    const data = await res.json()
    graphData.value = Array.isArray(data) ? data : []
    console.log("GRAPH", graphData.value)
  } catch (e) {
    console.log("loadGraph error", e)
  }
}


// 検索ボタン
async function searchReport() {

  if (mode.value === "cross") {
    const res = await fetch(
      `/api/cross-summary?scenario=${scenarioInput.value}&from=${from.value}&to=${to.value}`
    )
    const data = await res.json()
    summary.value = data.summary
  }

  if (mode.value === "area") {
    const res = await fetch(
      `/api/area-current?scenario=${scenarioInput.value}`
    )
    const data = await res.json()
    areaData.value = data
  }
}

// グラフ描画
function renderChart() {
  if (!chartRef.value) return

  const labels = graphData.value.map(r => r.time)
  const humanIn = graphData.value.map(r => r.human_in || 0)
  const carIn = graphData.value.map(r => r.car_in || 0)
  const bikeIn = graphData.value.map(r => r.bike_in || 0)
  const truckIn = graphData.value.map(r => r.truck_in || 0)

  if (chartInstance) {
    chartInstance.destroy()
  }

  chartInstance = new Chart(chartRef.value, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "human_in",
          data: humanIn,
          tension: 0.2
        },
        {
          label: "car_in",
          data: carIn,
          tension: 0.2
        },
        {
          label: "bike_in",
          data: bikeIn,
          tension: 0.2
        },
        {
          label: "truck_in",
          data: truckIn,
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  })
}

watch(graphData, () => {
  renderChart()
}, { deep: true })

watch(camId, async () => {
  await searchReport()
})

function startAutoRefresh() {
  stopAutoRefresh()

  timer = setInterval(async () => {
    await loadSummary()
    await loadGraph("hour")
  }, 3000)
}

function stopAutoRefresh() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function exportSummaryCsv() {
  const s = summary.value

  const totalIn =
    (s.human?.IN || 0) +
    (s.car?.IN || 0) +
    (s.bike?.IN || 0) +
    (s.bus?.IN || 0) +
    (s.truck?.IN || 0)

  const totalOut =
    (s.human?.OUT || 0) +
    (s.car?.OUT || 0) +
    (s.bike?.OUT || 0) +
    (s.bus?.OUT || 0) +
    (s.truck?.OUT || 0)

  let csv = "開始,終了,human_in,human_out,car_in,car_out,bike_in,bike_out,bus_in,bus_out,truck_in,truck_out,total_in,total_out\n"

  csv += [
    from.value,
    to.value,
    s.human?.IN || 0,
    s.human?.OUT || 0,
    s.car?.IN || 0,
    s.car?.OUT || 0,
    s.bike?.IN || 0,
    s.bike?.OUT || 0,
    s.bus?.IN || 0,
    s.bus?.OUT || 0,
    s.truck?.IN || 0,
    s.truck?.OUT || 0,
    totalIn,
    totalOut
  ].join(",") + "\n"

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "cross_summary.csv"
  a.click()
  URL.revokeObjectURL(url)
}

function exportTimeseriesCsv() {
  if (!graphData.value.length) {
    alert("時系列データなし")
    return
  }

  let csv = "時間,human_in,human_out,car_in,car_out,bike_in,bike_out,bus_in,bus_out,truck_in,truck_out\n"

  graphData.value.forEach(r => {
    csv += [
      r.time,
      r.human_in || 0,
      r.human_out || 0,
      r.car_in || 0,
      r.car_out || 0,
      r.bike_in || 0,
      r.bike_out || 0,
      r.bus_in || 0,
      r.bus_out || 0,
      r.truck_in || 0,
      r.truck_out || 0
    ].join(",") + "\n"
  })

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "cross_timeseries.csv"
  a.click()
  URL.revokeObjectURL(url)
}

const lastEventTime = {}
let ws = null

onMounted(() => {

  ws = new WebSocket("ws://192.168.1.196:8090")

  ws.onopen = () => {
    console.log("✅ WS CONNECTED")
  }

  ws.onmessage = (ev) => {

  const e = JSON.parse(ev.data)

  if (e.mode === "cross") {

    if (e.direction === "IN") {
      realtimeCounts.IN++
    }

    if (e.direction === "OUT") {
      realtimeCounts.OUT++
    }
  }

  console.log("COUNT", realtimeCounts)
}
/*
  ws.onmessage = (ev) => {

    const e = JSON.parse(ev.data)

    if (e.mode === "cross") {

      if (e.direction === "IN") {
        realtimeCounts.value = {
          ...realtimeCounts.value,
          IN: realtimeCounts.value.IN + 1
        }
      }

      if (e.direction === "OUT") {
        realtimeCounts.value = {
          ...realtimeCounts.value,
          OUT: realtimeCounts.value.OUT + 1
        }
      }
    }

    console.log("COUNT", realtimeCounts.value)
  }
*/
})

onUnmounted(() => {
  stopAutoRefresh()
})

onBeforeUnmount(() => {
  stopAutoRefresh()
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})


// CSV出力
/*
function exportSummaryCsv() {
  const s = summary.value

  const totalIn =
    (s.human?.IN || 0) +
    (s.car?.IN || 0) +
    (s.bike?.IN || 0) +
    (s.bus?.IN || 0) +
    (s.truck?.IN || 0)

  const totalOut =
    (s.human?.OUT || 0) +
    (s.car?.OUT || 0) +
    (s.bike?.OUT || 0) +
    (s.bus?.OUT || 0) +
    (s.truck?.OUT || 0)

  let csv = "開始,終了,human_in,human_out,car_in,car_out,bike_in,bike_out,bus_in,bus_out,truck_in,truck_out,total_in,total_out\n"

  csv += [
    from.value,
    to.value,
    s.human?.IN || 0,
    s.human?.OUT || 0,
    s.car?.IN || 0,
    s.car?.OUT || 0,
    s.bike?.IN || 0,
    s.bike?.OUT || 0,
    s.bus?.IN || 0,
    s.bus?.OUT || 0,
    s.truck?.IN || 0,
    s.truck?.OUT || 0,
    totalIn,
    totalOut
  ].join(",") + "\n"

  const blob = new Blob(
    ["\uFEFF" + csv],
    { type: "text/csv;charset=utf-8;" }
  )

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "cross_summary.csv"
  a.click()
  URL.revokeObjectURL(url)
}
*/
/* 時系列CSV出力 */
/*
function exportTimeseriesCsv() {
  if (!graphData.value.length) {
    alert("時系列データなし")
    return
  }

  let csv = "時間,human_in,human_out,car_in,car_out,bike_in,bike_out,bus_in,bus_out,truck_in,truck_out\n"

  graphData.value.forEach(r => {
    csv += [
      r.time,
      r.human_in || 0,
      r.human_out || 0,
      r.car_in || 0,
      r.car_out || 0,
      r.bike_in || 0,
      r.bike_out || 0,
      r.bus_in || 0,
      r.bus_out || 0,
      r.truck_in || 0,
      r.truck_out || 0
    ].join(",") + "\n"
  })

  const blob = new Blob(
    ["\uFEFF" + csv],
    { type: "text/csv;charset=utf-8;" }
  )

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "cross_timeseries.csv"
  a.click()
  URL.revokeObjectURL(url)
}
*/
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status {
  font-size: 12px;
  color: #0f0;
  background: #111;
  padding: 4px 10px;
  border-radius: 12px;
}

.page {
  padding: 16px;
  background: #111;
  color: #eee;
}

.realtime-box {
  font-size: 32px;
  font-weight: bold;
  letter-spacing: 1px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 10px 0;
}

.filters label {
  font-size: 12px;
  color: #ccc;
}
.summary-box {
  margin: 16px 0;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: #1a1a1a;
  color: #eee;
}

th {
  background: #222;
  color: #0f0;
}

td {
  border: 1px solid #333;
}

button {
  padding: 6px 12px;
  background: #222;
  color: #eee;
  border: 1px solid #444;
  border-radius: 6px;
}

button:hover {
  background: #333;
}
.chart-box {
  width: 100%;
  height: 320px;
  background: #1a1a1a;
  padding: 12px;
  box-sizing: border-box;
  margin-bottom: 16px;
  border-radius: 8px;
}
</style>