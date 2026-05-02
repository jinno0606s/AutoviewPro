<template>
  <div class="page">
    <h2>人数カウント</h2>

    <!-- フィルタ -->
    <div class="filters">
      <label>カメラ:</label>
      <select v-model="selectedCam">
        <option value="">すべて</option>
        <option v-for="cam in cameras" :key="cam" :value="cam">
          {{ cam }}
        </option>
      </select>

      <label>
        開始
        <input type="datetime-local" v-model="from" />
      </label>

      <label>
        終了
        <input type="datetime-local" v-model="to" />
      </label>

       <label>
        集計単位
        <select v-model="interval">
          <option value="10m">10分</option>
          <option value="1h">1時間</option>
          <option value="1d">1日</option>
        </select>
      </label>
      <button @click="loadAll">更新</button>

      <button @click="searchReport">集計</button>
      <button @click="exportTimeseriesCsv">CSV出力</button>
    </div>

    
    <!-- 上：サマリー -->
    <table class="report-table">
      <thead>
        <tr>
          <th>種類</th>
          <th>IN</th>
          <th>OUT</th>
          <th>TOTAL</th>
          <th>現在（AREA）</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="(d, type) in summary" :key="type">
          <td>{{ type }}</td>
          <td>{{ d.IN }}</td>
          <td>{{ d.OUT }}</td>
          <td>{{ d.IN + d.OUT }}</td>
          <td>{{ realtime.AREA[type] || 0 }}</td>
        </tr>
      </tbody>
    </table>

    <!-- グラフ -->
    <canvas id="chart" style="margin-top:20px;"></canvas>

    <!-- 下：時間帯 -->
    <h3>時間帯別集計</h3>

    <table class="report-table">
      <thead>
        <tr>
          <th>時間</th>
          <th>human IN</th>
          <th>human OUT</th>
          <th>car IN</th>
          <th>car OUT</th>
          <th>bike IN</th>
          <th>bike OUT</th> 
          <th>bus IN</th>
          <th>bus OUT</th>
          <th>truck IN</th>
          <th>truck OUT</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="row in graphData" :key="row.time">
          <td>{{ row.time }}</td> 
          <td>{{ row.human_in }}</td>
          <td>{{ row.human_out }}</td>
          <td>{{ row.car_in }}</td>
          <td>{{ row.car_out }}</td>
          <td>{{ row.bike_in }}</td>
          <td>{{ row.bike_out }}</td>
          <td>{{ row.bus_in}}</td>
          <td>{{ row.bus_out}}</td>
          <td>{{ row.truck_in}}</td>
          <td>{{ row.truck_out}}</td>
        </tr>
      </tbody>
    </table>
    
  </div>

</template>

<script setup>

import { ref, reactive, nextTick } from "vue"
import Chart from "chart.js/auto"

const graphData = ref([])
const summary = ref({})

const realtime = reactive({
  AREA: {}
})

const from = ref("")
const to = ref("")
const interval = ref("10m")
const selectedCam = ref("")
const selectedTypes = ref(["human", "car"])

let chart = null

async function loadAll() {
  try {
    const areaRes = await fetch("/api/people-area")
    const areaJson = await areaRes.json()

    realtime.AREA = areaJson.area || {}
    
    if (!from.value || !to.value) {
      alert("期間を設定してください")
      return
    }

    const res = await fetch(
      `/api/people-timeseries?from=${from.value}&to=${to.value}&interval=${interval.value}&camera=${selectedCam.value}`
    )

    // 🔥 ここ追加（超重要）
    if (!res.ok) {
      const text = await res.text()
      console.error("API ERROR:", text)
      throw new Error("API failed")
    }

    const json = await res.json()

    graphData.value = json.data || []

    buildSummary()

    await nextTick()
    renderChart()

  } catch (e) {
    console.error("loadAll error:", e)
  }
}

function renderChart() {

  if (chart) chart.destroy()

  const ctx = document.getElementById("chart")

  if (!ctx) {
    console.log("canvas not found")
    return
  }

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: graphData.value.map(g => formatTime(g.time)),

      datasets: [
        {
          label: "human IN",
          data: graphData.value.map(g => g.human_in)
        },
        {
          label: "human OUT",
          data: graphData.value.map(g => g.human_out)
        }
      ]
    }
  })
}

// =================
// データ取得
// =================

function buildSummary() {

  const s = {
    human:{IN:0,OUT:0},
    car:{IN:0,OUT:0},
    bike:{IN:0,OUT:0},
    bus:{IN:0,OUT:0},
    truck:{IN:0,OUT:0}
  }

  for (const g of graphData.value) {

    s.human.IN += g.human_in || 0
    s.human.OUT += g.human_out || 0

    s.car.IN += g.car_in || 0
    s.car.OUT += g.car_out || 0

    s.bike.IN += g.bike_in || 0
    s.bike.OUT += g.bike_out || 0

    s.bus.IN += g.bus_in || 0
    s.bus.OUT += g.bus_out || 0

    s.truck.IN += g.truck_in || 0
    s.truck.OUT += g.truck_out || 0
  }

  summary.value = s
}

function formatTime(t) {
  return new Date(t).toLocaleString()
}
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