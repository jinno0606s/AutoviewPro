// peopleCount.js
const mqtt = require("mqtt")
const fs = require("fs")
const path = require("path")

let client
const lastCounts = {}
const events = []

const csvPath = path.join(__dirname, "../data/events.csv")
//const type = (d.classTypes || "human").toLowerCase()

if (!fs.existsSync(csvPath)) {
  fs.writeFileSync(csvPath, "ts,serial,scenario,mode,type,direction,value\n")
}

// MQTT → WS送信
function broadcast(event) {
  console.log("📤 WS SEND", event)
  if (!global.wsClients) return

  const msg = JSON.stringify(event)

  global.wsClients.forEach(ws => {
    try {
      ws.send(msg)
    } catch {}
  })
}
// =======================
// 初期化（←これが重要）
// =======================

function initPeopleCount() {

  console.log("🚀 PEOPLE COUNT INIT")

  client = mqtt.connect("mqtt://localhost")

  client.on("connect", () => {
    console.log("✅ MQTT CONNECT (people)")
    client.subscribe("axis/#")
  })


  client.on("message", (topic, message) => {

    console.log("📡", topic)

    let json
    try {
      json = JSON.parse(message.toString())
    } catch {
      return
    }

    const result = normalizeEvent(json, lastCounts, topic)
    if (!result) return

    // 🔥 ここが一番重要
    const list = Array.isArray(result) ? result : [result]

    list.forEach(event => {

      // 念のためガード
      if (!event || !event.ts) return

      events.push(event)
      global.crossEvents = events
      broadcast(event)

      fs.appendFileSync(
        csvPath,
        `${event.ts},${event.serial},${event.scenario},${event.mode},${event.type},${event.direction},${event.value}\n`
      )

      console.log("🚀 EVENT", event)
    })
  })


}

// =======================
// normalize
// =======================
function normalizeEvent(json, lastCounts = {}, topic = "") {

  const d = json.message?.data
  if (!d) return null

  const serial = json.serial || "unknown"

  const ts = d.triggerTime
    ? new Date(d.triggerTime).getTime()
    : Date.now()

  const match = topic.match(/Scenario(\d+)/)
  const scenario = match ? Number(match[1]) : null
  if (!scenario) return null

  const SCENARIO_CONFIG = {
    1: { mode: "cross", direction: "IN" },
    2: { mode: "area" },
    3: { mode: "cross", direction: "OUT" }
  }

  const config = SCENARIO_CONFIG[scenario]
  if (!config) return null

  // =========================
  // CROSS（人だけでOK）
  // =========================
  if (config.mode === "cross") {

    const type = d.reason?.toLowerCase()
    if (!type) return null

    return {
      ts,
      serial,
      scenario,
      mode: "cross",
      type,
      direction: config.direction,
      value: 1
    }
  }

  // =========================
  // AREA（全部出す）
  // =========================
  if (config.mode === "area") {

    const results = []

    const TYPES = ["human", "car", "bike", "bus", "truck", "otherVehicle"]

    TYPES.forEach(type => {
      if (d[type] !== undefined) {
        results.push({
          ts,
          serial,
          scenario,
          mode: "area",
          type,
          direction: null,
          value: Number(d[type])
        })
      }
    })

    return results.length ? results : null
  }

  return null
}

/*
function normalizeEvent(json, lastCounts = {}, topic = "") {

  const d = json.message?.data
  if (!d) return null

  const serial = json.serial || "unknown"

  const ts = d.triggerTime
    ? new Date(d.triggerTime).getTime()
    : Date.now()

  const match = topic.match(/Scenario(\d+)/)
  const scenario = match ? Number(match[1]) : null
  if (!scenario) return null

  // 🔥 修正：正しいシナリオ
  const SCENARIO_CONFIG = {
    1: { mode: "cross", direction: "IN" },
    2: { mode: "area" },
    3: { mode: "cross", direction: "OUT" }
  }

  const config = SCENARIO_CONFIG[scenario]
  if (!config) return null

  // =========================
  // CROSS
  // =========================
  if (config.mode === "cross") {
    return {
      ts,
      serial,
      scenario,
      mode: "cross",
      type: "human",
      direction: config.direction,
      value: 1
    }
  }

  // =========================
  // AREA（AOA）
  // =========================
  if (config.mode === "area") {

    // 🔥 activeチェック削除
    const value =
      d.human !== undefined ? Number(d.human) :
      d.total !== undefined ? Number(d.total) :
      0

    return {
      ts,
      serial,
      scenario,
      mode: "area",
      type: "human",
      direction: null,
      value
    }
  }

  return null
}
*/
// =======================
// API用
// =======================

function getEvents() {
  return events
}

module.exports = {
  initPeopleCount,
  getEvents
}