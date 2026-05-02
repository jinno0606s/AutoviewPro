const mqtt = require("mqtt")
const fs = require("fs")

const lastCounts = {}
const diffCounts = {}
const buckets = {}   // ← ここOK
const events = []

function startMqttTest() {

  const client = mqtt.connect("mqtt://localhost")

  client.on("connect", () => {
    console.log("✅ MQTT TEST CONNECT")
    client.subscribe("axis/+/event/tns:axis/CameraApplicationPlatform/ObjectAnalytics/#")
  })

  client.on("message", (topic, message) => {

    try {

      const data = JSON.parse(message.toString())

      const serial = data.serial
      const total = Number(data.message?.data?.totalHuman || 0)

      if (!serial) return

      const prev = lastCounts[serial] || total
      let diff = total - prev   // ← ここで初めて定義

      lastCounts[serial] = total

      // リセット対策
      if (diff < 0) diff = total
/*
      if (diff >= 0) {

        diffCounts[serial] = (diffCounts[serial] || 0) + diff

        // 🔥 ここでバケット処理
        const now = Date.now()
        const bucket = Math.floor(now / (15 * 60 * 1000)) * (15 * 60 * 1000)

        buckets[bucket] = (buckets[bucket] || 0) + diff
      }
*/
      if (diff > 0) {

        diffCounts[serial] = (diffCounts[serial] || 0) + diff

       // const now = Date.now()

        const now = new Date()

        const line =
          `${now.toISOString()},${serial},${diff}\n`

        fs.appendFileSync(
          "/home/comworks/AutoviewPro/data/events.csv",
          line
        )
        
        events.push({
          ts: now,
          serial,
          count: diff
        })

        // 上限
        if (events.length > 10000) {
          events.shift()
        }

        // バケット
        const bucket = Math.floor(now / (15 * 60 * 1000)) * (15 * 60 * 1000)
        buckets[bucket] = (buckets[bucket] || 0) + diff
      }


      console.log("📊 DIFF", {
        serial,
        diff,
        total: diffCounts[serial]
      })

    } catch (e) {
      console.log("MQTT parse error", e)
    }

  })
}

module.exports = {
  startMqttTest,
  getCounts: () => diffCounts,
  getSummary: () => buckets,   // ← 追加
  getEvents: () => events
}