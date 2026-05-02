// peopleCount.js
const mqtt = require("mqtt")
const fs = require("fs")
const path = require("path")

const client = mqtt.connect("mqtt://localhost")

// =======================
// データストア
// =======================

// 通過イベント
const crossEvents = []

// 滞留状態
const occupancyState = {}

// CSVパス
const crossCsvPath = path.join(__dirname, "../data/cross_events.csv")
const occCsvPath   = path.join(__dirname, "../data/occupancy.csv")

// CSVヘッダ初期化
if (!fs.existsSync(crossCsvPath)) {
  fs.writeFileSync(crossCsvPath, "ts,serial,direction,type,count\n")
}

if (!fs.existsSync(occCsvPath)) {
  fs.writeFileSync(occCsvPath, "ts,serial,occupancy\n")
}

// API用カウント取得関数
function getCounts() {
  return global.peopleCounts || {}
}
// =======================
// MQTT接続
// =======================
client.on("connect", () => {
  console.log("✅ MQTT CONNECT")
  client.subscribe("axis/+/event/tns:axis/CameraApplicationPlatform/ObjectAnalytics/#")
  //client.subscribe("#")
})

// =======================
// MQTT受信
// =======================
let totals = {}

client.on("message", (topic, message) => {

  if (!topic.includes("AOA")) return

  let json
  try {
    json = JSON.parse(message.toString())
  } catch (e) {
    console.log("SKIP:", message.toString())
    return
  }

  const serial = json.serial || "unknown"
  const data = json.message?.data || {}
  const ts = Date.now()

  // ===================
  // CROSS
  // ===================
  if (data.lineCrossingDirection) {

    const direction =
      data.lineCrossingDirection === "Direction1" ? "IN" :
      data.lineCrossingDirection === "Direction2" ? "OUT" :
      "UNK"

    const type = data.reason || "unknown"

    const event = { ts, serial, direction, type, count: 1 }
    crossEvents.push(event)

    fs.appendFileSync(
      crossCsvPath,
      `${ts},${serial},${direction},${type},1\n`
    )

    // ⭐ totals更新
    if (!totals[serial]) {
      totals[serial] = { human: 0, car: 0, bus: 0, bike: 0, truck: 0 }
    }

    if (direction === "IN") {
      if (totals[serial][type] !== undefined) {
        totals[serial][type] += 1
      }
    }

    console.log("🚶 CROSS", event)
  }

  // ===================
  // OCCUPANCY
  // ===================
  if (data.occupancy !== undefined) {

    const occupancy = Number(data.occupancy)

    occupancyState[serial] = { ts, count: occupancy }

    fs.appendFileSync(
      occCsvPath,
      `${ts},${serial},${occupancy}\n`
    )

    console.log("📍 OCCUPANCY", serial, occupancy)
  }

  // global
  global.crossEvents = crossEvents
  global.occupancyState = occupancyState
  global.peopleCounts = totals
})

// =======================
// API用
// =======================

module.exports = {
  getCounts,
  getCrossEvents: () => crossEvents,
  getOccupancy: () => occupancyState
}