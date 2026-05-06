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
  //client.subscribe("axis/+/event/tns:axis/CameraApplicationPlatform/ObjectAnalytics/#")
  client.subscribe("#")
})

// =======================
// MQTT受信
// =======================
let totals = {}
client.on("message", (topic, message) => {
  // AOAだけ
  if (!topic.includes("AOA")) return

  let msg
  try {
    msg = JSON.parse(message.toString())
  } catch (e) {
    console.log("SKIP:", message.toString())
    return
  }

  try {
    const json = JSON.parse(message.toString())
    
    const serial = json.serial || "unknown"
    const data = json.message?.data || {}

    const ts = Date.now()

    // =======================
    // ① Crossline（通過）
    // =======================
    if (data.lineCrossingDirection) {

      const directionRaw = data.lineCrossingDirection
      const type = data.reason || "unknown"

      // Direction変換（任意）
      const direction =
        directionRaw === "Direction1" ? "IN" :
        directionRaw === "Direction2" ? "OUT" :
        directionRaw

      const event = {
        ts,
        serial,
        direction,
        type,
        count: 1
      }

      crossEvents.push(event)

      // CSV追記
      fs.appendFileSync(
        crossCsvPath,
        `${ts},${serial},${direction},${type},1\n`
      )

      console.log("🚶 CROSS", event)
    }

    // =======================
    // ② Area（滞留）
    // =======================
    if (data.occupancy !== undefined) {

      const occupancy = Number(data.occupancy)

      occupancyState[serial] = {
        ts,
        count: occupancy
      }

      // CSV追記
      fs.appendFileSync(
        occCsvPath,
        `${ts},${serial},${occupancy}\n`
      )

      console.log("📍 OCCUPANCY", serial, occupancy)
    }

    // =======================
    // global（API用）
    // =======================

    global.crossEvents = crossEvents
    global.occupancyState = occupancyState
    global.peopleCounts = totals
  } catch (e) {
    console.error("MQTT PARSE ERROR", e)
  }
})

// =======================
// API用
// =======================

module.exports = {
  getCounts,
  getCrossEvents: () => crossEvents,
  getOccupancy: () => occupancyState
}