// peopleCount.js   20260413
const mqtt = require("mqtt")
const fs = require("fs")
const path = require("path")

const client = mqtt.connect("mqtt://localhost")

// =======================
// データストア
// =======================

const lastCounts = {}     // 前回値（差分用）
const events = []         // 生イベント
const totals = {}         // 種類別累計
const buckets = {}        // 時間集計

// CSV
const csvPath = path.join(__dirname, "../data/events.csv")

if (!fs.existsSync(csvPath)) {
  fs.writeFileSync(csvPath, "ts,serial,type,count\n")
}

// =======================
// MQTT接続
// =======================

client.on("connect", () => {
  console.log("✅ MQTT CONNECT")
  client.subscribe("axis/#") // ← ここ重要
})

// =======================
// MQTT受信
// =======================
/*
client.on("message", (topic, message) => {

  console.log("📡 TOPIC:", topic)
  console.log("📦 RAW:", message.toString())

  let json
  try {
    json = JSON.parse(message.toString())
  } catch (e) {
    console.log("❌ JSONじゃない")
    return
  }

  console.log("🔥 JSON:", JSON.stringify(json, null, 2))

})
*/

client.on("message", (topic, message) => {

  let json
  try {
    json = JSON.parse(message.toString())
  } catch {
    return
  }

  const event = normalizeEvent(json, lastCounts)

  if (!event) return

  events.push(event)

  // CSV保存
  fs.appendFileSync(
    csvPath,
    `${new Date(event.ts).toISOString()},${event.serial},${event.mode},${event.type},${event.direction},${event.value}\n`
  )

  console.log("🚀 EVENT", event)
})

// 🚀 normalize関数
function normalizeEvent(json, lastCounts = {}) {

  const data = json.message?.data || {}
  const serial = json.serial || "unknown"
  const ts = Date.now()

  // =========================
  // CROSS（ライン通過）
  // =========================
  if (data.reason && data.total) {

    const type = data.reason

    const total =
      type === "human" ? Number(data.totalHuman || 0) :
      type === "car"   ? Number(data.totalCar || 0) :
      type === "bus"   ? Number(data.totalBus || 0) :
      type === "bike"  ? Number(data.totalBike || 0) :
      type === "truck" ? Number(data.totalTruck || 0) :
      0

    if (!lastCounts[serial]) lastCounts[serial] = {}

    const prev = lastCounts[serial][type] ?? total

    let diff = total - prev
    if (diff < 0) diff = total

    lastCounts[serial][type] = total

    if (diff <= 0) return null

    // direction（シナリオ依存 → 吸収）
    const direction =
      data.scenario === "Scenario 1" ? "IN" :
      data.scenario === "Scenario 2" ? "OUT" :
      "IN"

    return {
      ts,
      serial,
      mode: "cross",
      type,
      direction,
      value: diff
    }
  }

  // =========================
  // AREA（滞在）
  // =========================
  if (data.occupancy !== undefined) {

    return {
      ts,
      serial,
      mode: "area",
      type: "human",
      direction: null,
      value: Number(data.occupancy)
    }
  }

  return null
}

// =======================
// API用
// =======================

function getEvents() {
  return events
}

function getCounts() {
  return totals
}

function getSummary(unit = "minute") {

  const result = []

  Object.keys(buckets).forEach(k => {

    const t = Number(k)
    const d = new Date(t)

    let label

    if (unit === "hour") {
      label = `${d.getHours()}:00`
    } else if (unit === "day") {
      label = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`
    } else {
      label = `${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}`
    }

    result.push({
      time: label,
      ...buckets[k]
    })
  })

  return result
}

module.exports = {
  getEvents,
  getCounts,
  getSummary
}