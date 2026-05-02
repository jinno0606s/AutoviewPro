// /core/peopleCount.js 
const mqtt = require("mqtt")
const fs = require("fs")
const path = require("path")

const lastCounts = {}
const totals = {}
const events = []

global.peopleCounts = {}
global.events = events

function startPeopleCount(cameras) {

  console.log("🚀 PEOPLE COUNT MQTT MODE")

  const client = mqtt.connect("mqtt://localhost")

  client.on("connect", () => {
    console.log("✅ MQTT CONNECT")

    client.subscribe("axis/+/event/tns:axis/CameraApplicationPlatform/ObjectAnalytics/#")
  })

  client.on("message", (topic, message) => {

    try {

      const data = JSON.parse(message.toString())
      const serial = data.serial
      const d = data.message?.data || {}

      if (!serial) return

      const scenario = d.scenario || "unknown"

      const current = {
        human: Number(d.totalHuman || d.human || 0),
        car: Number(d.totalCar || d.car || 0),
        bus: Number(d.totalBus || d.bus || 0),
        bike: Number(d.totalBike || d.bike || 0),
        truck: Number(d.totalTruck || d.truck || 0)
      }

      const prev = lastCounts[serial] || current

      const diff = {}
      Object.keys(current).forEach(k => {
        diff[k] = current[k] - (prev[k] || 0)
        if (diff[k] < 0) diff[k] = 0
      })

      lastCounts[serial] = current

      // 累積
      if (!totals[serial]) {
        totals[serial] = { human: 0, car: 0, bus: 0, bike: 0, truck: 0 }
      }

      Object.keys(diff).forEach(k => {
        totals[serial][k] += diff[k]
      })

      // 🔥 UI用
      global.peopleCounts[serial] = totals[serial]

      // 🔥 イベント保存
      if (diff.human > 0) {
        const ev = {
          ts: Date.now(),
          serial,
          scenario,
          type: "human",
          count: diff.human
        }

        events.unshift(ev)
        saveCsv(ev)
      }

      console.log("📊", serial, diff, totals[serial])

    } catch (e) {
      console.log("MQTT ERROR", e.message)
    }

  })
}

function saveCsv(ev) {

  const file = path.join(process.cwd(), "data/events.csv")

  const line = `${new Date(ev.ts).toISOString()},${ev.serial},${ev.type},${ev.count}\n`

  fs.appendFileSync(file, line)
}

module.exports = {
  startPeopleCount,
  getCounts: () => global.peopleCounts,
  getEvents: () => events
}