// webApiServer.js
const http = require("http")
const fs = require("fs")
const path = require("path")
const { runTimelapse, getCameraFolder } = require("../core/timelapse.js")
const { buildVideoFromRange } = require("../core/timelapseVideo")
const state = require("../core/state")
const { spawn } = require("child_process")
const liveRunning = {}
const multer = require("multer")
const upload = multer({ dest: "uploads/" })
const { exec } = require("child_process")
const { initPeopleCount } = require("../core/peopleCount")
const events = global.crossEvents || []

function startWebApiServer(ctx){

  const {
    dbAll,
    dbGet,
    dbRun,
    runLayout,
    stopPipeline,
    startPipeline,
    playSpeakerClip,
    LOCAL_IP
  } = ctx

  const PORT = 8080

  const dist =
  path.join(__dirname,"../uiapp/dist")

  // STATE LOG
  function addLog(type, msg){
    state.logs.unshift({
      time: Date.now(),
      type,
      msg
    })

    // 最大100件
    if(state.logs.length > 100){
      state.logs.pop()
    }
  }

  const server = http.createServer(async (req,res)=>{
    const url = req.url.split("?")[0]
    // =================
    // API
    // =================
    // 🎬 MP4配信（最優先）
    if(req.url.startsWith("/exports/")){
      const filePath = path.join(__dirname, "..", "data", req.url.replace("/exports/", "exports/"))

      if(!fs.existsSync(filePath)){
        res.writeHead(404)
        return res.end("NOT FOUND")
      }

      res.writeHead(200, {
        "Content-Type": "video/mp4"
      })

      fs.createReadStream(filePath).pipe(res)
      return
    }


    if(req.url === "/api/plugins"){

      const plugins = [
        {
          name: "timelapse",
          label: "タイムラプス",
          icon: "⏱"
        },
        {
          name: "people",
          label: "人数カウント",
          icon: "👤"
        }
      ]

      res.writeHead(200, {
        "Content-Type": "application/json"
      })

      res.end(JSON.stringify(plugins))
      return
    }

    if(req.url === "/api/timelapse/logs"){
      res.writeHead(200, { "Content-Type":"application/json" })
      res.end(JSON.stringify({
        running: state.manualRun,
        logs: state.logs
      }))
      return
    }

    if(req.url.startsWith("/api/layout/")){

      const count =
      Number(req.url.split("/").pop())

      runLayout(count,10)

      res.writeHead(200)
      res.end("OK")
      return
    }

    if(req.url === "/api/stop"){

      stopPipeline()

      res.writeHead(200)
      res.end("STOP")
      return
    }


    // cameras

    if(req.url === "/api/cameras"){

      const rows = await dbAll(`
        SELECT * FROM cameras
        ORDER BY id
      `)

      res.writeHead(200,{
        "Content-Type":"application/json"
      })

      res.end(JSON.stringify(rows))
      return
    }


    // camera show

    if(req.url.startsWith("/api/camera/")){

      const id = Number(req.url.split("/").pop())

      const cam = await dbGet(`
        SELECT * FROM cameras WHERE id=?
      `,[id])

      if(cam){

        startPipeline([{
          url: cam.rtsp_url,
          name: cam.name
        }],1)

      }

      res.end("OK")
      return
    }
    
    // camera update

    if(req.url.startsWith("/api/cameras/update") && req.method === "POST"){

      let body = ""

      req.on("data", chunk => body += chunk)

      req.on("end", async ()=>{

        try{

          const data = JSON.parse(body)

          await dbRun(`
            UPDATE cameras SET
              name=?,
              rtsp_url=?,
              address=?,
              lat=?,
              lng=?,
              people_count_enabled=?,
              people_count_type=?
            WHERE id=?
          `,[
            data.name,
            data.rtsp_url,
            data.address,
            data.lat,
            data.lng,
            data.people_count_enabled ? 1 : 0,
            data.people_count_type || "ai",
            data.id
          ])

          res.writeHead(200, { "Content-Type":"application/json" })
          res.end(JSON.stringify({ ok:true }))

        }catch(e){
          console.error(e)
          res.writeHead(500)
          res.end(JSON.stringify({ ok:false }))
        }

      })

      return
    }

    // ptz
    if(req.url.startsWith("/api/ptz/")){

      const parts = req.url.split("/")

      const id = Number(parts[3])
      const cmd = parts[4]

      console.log("PTZ:",id,cmd)

      // 仮
      res.writeHead(200)
      res.end("OK")
      return
    }

    if(req.url.startsWith("/api/speakers")){

      console.log("API /api/speakers")

      const rows = await dbAll(`
        SELECT *
        FROM speakers
        ORDER BY id DESC
      `)

      res.writeHead(200,{
        "Content-Type":"application/json"
      })

      res.end(JSON.stringify(rows))
      return
    }
/*
    if (req.url === "/api/events") {
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(global.events || []))
      return
    }
  */
    // ==========================
    // タイムラプス実行
    // ==========================
    // タイムラプスSTART
    let manualRun = false

        // START
    if(req.url === "/api/timelapse/start" && req.method === "POST"){
      state.manualRun = true
       addLog("info", "START")
      res.end(JSON.stringify({ ok:true }))
      return
    }

    // STOP
    if(req.url === "/api/timelapse/stop" && req.method === "POST"){
      state.manualRun = false
       addLog("info", "START")
      res.end(JSON.stringify({ ok:true }))
      return
    }

    // STATUS
    if(req.url === "/api/timelapse/status"){
      res.writeHead(200, { "Content-Type":"application/json" })
      res.end(JSON.stringify({ running: state.manualRun }))
      return
    }

    if(req.url === "/api/timelapse/run" && req.method === "POST"){

      let body = ""

      req.on("data", chunk => body += chunk)

      req.on("end", async ()=>{

        try{

          const data = body ? JSON.parse(body) : {}

          const cam = await dbGet(`
            SELECT * FROM cameras WHERE id=?
          `,[data.camera_id || 1])

          if(!cam){
            res.writeHead(404)
            return res.end(JSON.stringify({ ok:false }))
          }

          const events = await runTimelapse({
            camera: cam,
            now: new Date()
          })

          res.writeHead(200,{
            "Content-Type":"application/json"
          })

          res.end(JSON.stringify(events))

        }catch(e){

          console.error("timelapse error:", e)
          addLog("error", e.message)
          res.writeHead(500)
          res.end(JSON.stringify({ ok:false }))
        }

      })

      return
    }
    // タイムラプスファイルリスト取得 画像一覧API
    if(req.url.startsWith("/api/timelapse/files") && req.method === "GET"){
      try{
        const u = new URL(req.url, "http://localhost")
        const cameraId = Number(u.searchParams.get("camera_id"))
        const from = Number(u.searchParams.get("from") || 0)
        const to = Number(u.searchParams.get("to") || Date.now())

        const cam = await dbGet(`SELECT * FROM cameras WHERE id=?`, [cameraId])
        if(!cam){
          res.writeHead(404, { "Content-Type":"application/json" })
          return res.end(JSON.stringify({ ok:false, error:"camera not found" }))
        }

        const dir = getCameraFolder(cam)
        if(!fs.existsSync(dir)){
          res.writeHead(200, { "Content-Type":"application/json" })
          return res.end(JSON.stringify({ ok:true, files:[] }))
        }

        const files = fs.readdirSync(dir)
          .filter(f => f.toLowerCase().endsWith(".jpg"))
          .map(f => {
            const full = path.join(dir, f)
            const stat = fs.statSync(full)
            return {
              name: f,
              path: full,
              time: stat.mtimeMs,
              url: `/timelapse-file/${cam.id}/${encodeURIComponent(f)}`
            }
          })
         // .filter(f => f.time >= from && f.time <= to)
          .filter(f => true)
          .sort((a,b) => a.time - b.time)

        res.writeHead(200, { "Content-Type":"application/json" })
        res.end(JSON.stringify({ ok:true, files }))
      }catch(e){
        res.writeHead(500, { "Content-Type":"application/json" })
        res.end(JSON.stringify({ ok:false, error:e.message }))
      }
      return
    }
    // タイムラプスファイル取得 JPEG 配信API
    if(req.url.startsWith("/timelapse-file/") && req.method === "GET"){
      try{
        const parts = req.url.split("/")
        const cameraId = Number(parts[2])
        const filename = decodeURIComponent(parts.slice(3).join("/"))

        const cam = await dbGet(`SELECT * FROM cameras WHERE id=?`, [cameraId])
        if(!cam){
          res.writeHead(404)
          return res.end("NOT FOUND")
        }

        const dir = getCameraFolder(cam)
        const filePath = path.join(dir, filename)

        if(!fs.existsSync(filePath)){
          res.writeHead(404)
          return res.end("NOT FOUND")
        }

        res.writeHead(200, { "Content-Type":"image/jpeg" })
        res.end(fs.readFileSync(filePath))
      }catch(e){
        res.writeHead(500)
        res.end("ERROR")
      }
      return
    }
    // タイムラプスファイル削除API
    if(req.url === "/api/timelapse/delete" && req.method === "POST"){
      let body = ""
      req.on("data", chunk => body += chunk)
      req.on("end", async ()=>{
        try{
          const data = JSON.parse(body)
          const cam = await dbGet(`SELECT * FROM cameras WHERE id=?`, [data.camera_id])

          if(!cam){
            res.writeHead(404, { "Content-Type":"application/json" })
            return res.end(JSON.stringify({ ok:false }))
          }

          const dir = getCameraFolder(cam)

          for(const name of data.files || []){
            const filePath = path.join(dir, name)
            if(fs.existsSync(filePath)){
              fs.unlinkSync(filePath)
            }
          }

          res.writeHead(200, { "Content-Type":"application/json" })
          res.end(JSON.stringify({ ok:true }))
        }catch(e){
          res.writeHead(500, { "Content-Type":"application/json" })
          res.end(JSON.stringify({ ok:false, error:e.message }))
        }
      })
      return
    }
    
    // タイムラプスMP$　削除ボタン
    if(req.url === "/api/timelapse/video/delete" && req.method === "POST"){
      let body = ""
      req.on("data", chunk => body += chunk)
      req.on("end", ()=>{
        const { name } = JSON.parse(body)

        const filePath = path.join("./data/exports", name)

        if(fs.existsSync(filePath)){
          fs.unlinkSync(filePath)
        }

        res.writeHead(200, { "Content-Type":"application/json" })
        res.end(JSON.stringify({ ok:true }))
      })
      return
    }

    // タイムラプス動画生成API  プレビューAPI / 出力API
    if(req.url.startsWith("/api/timelapse/preview") && req.method === "GET"){
      try{
        const u = new URL(req.url, "http://localhost")

        const cameraId = Number(u.searchParams.get("camera_id"))
        const from = Number(u.searchParams.get("from"))
        const to = Number(u.searchParams.get("to"))
        const fps = Number(u.searchParams.get("fps") || 12)

        // ✅ ここ追加
        const speed = Number(u.searchParams.get("speed") || 1)

        const cam = await dbGet(
          `SELECT * FROM cameras WHERE id=?`,
          [cameraId]
        )

        // ❗ ここも変更
        const result = buildVideoFromRange(cam, from, to, fps, speed)

        res.writeHead(200, { "Content-Type":"application/json" })
        res.end(JSON.stringify({
          ok:true,
          url: result.url
        }))

      }catch(e){
        console.error("💥 PREVIEW ERROR:", e)
        res.writeHead(500, { "Content-Type":"application/json" })
        res.end(JSON.stringify({ ok:false, error:e.message }))
      }

      return
    }

     // タイムラプス動画一覧API
    if(req.url === "/api/timelapse/videos"){
      const files = fs.readdirSync("./data/exports")
        .filter(f => f.endsWith(".mp4"))
        .map(f => ({
          name: f,
          url: `/exports/${f}`,
          time: Number(f.split("_").pop().replace(".mp4",""))
        }))
        .sort((a,b)=>b.time-a.time)

    //  res.json({ ok:true, files })
        res.writeHead(200, { "Content-Type":"application/json" })
        res.end(JSON.stringify({ ok:true, files }))

      return
    }

    if(req.url.startsWith("/api/timelapse/latest")){
      const camId = Number(new URL(req.url,"http://x").searchParams.get("camera_id"))

      const dir = path.join("./data/timelapse", "A") // 仮

      const files = fs.readdirSync(dir)
        .filter(f => f.endsWith(".jpg"))
        .sort()
      
      const latest = files[files.length - 1]

      const filePath = path.join(dir, latest)

      res.writeHead(200, { "Content-Type":"image/jpeg" })
      fs.createReadStream(filePath).pipe(res)
      return
    }
    
    if (req.url.startsWith("/api/live/jpeg")) {

      const url = new URL(req.url, "http://localhost")  // ← これ必須

      const camId = String(url.searchParams.get("cam")).trim()

      const buffer = global.latestFrames?.[camId]

      if (!buffer) {
        res.writeHead(404)
        return res.end()
      }

      res.writeHead(200, {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-cache"
      })

      res.end(buffer)
      return
    }

　////////人数カウント////////////////////
    if (req.url.startsWith("/api/people/analyze") && req.method === "POST") {

      try {

        const filePath = "/home/comworks/test/test1.mp4"

        console.log("📁 ANALYZE", filePath)

        const framesDir = "data/frames"

        // 🔥 毎回リセット
        fs.rmSync(framesDir, { recursive: true, force: true })
        fs.mkdirSync(framesDir, { recursive: true })

        // 🔥 ランダム位置
        const start = Math.floor(Math.random() * 300)

        await new Promise((resolve, reject) => {
          exec(
            `ffmpeg -ss ${start} -i ${filePath} -t 10 -vf fps=1 ${framesDir}/frame_%04d.jpg`,
            (err) => err ? reject(err) : resolve()
          )
        })

        const files = fs.readdirSync(framesDir)

        const results = []

        for (const f of files) {

          const full = path.join(framesDir, f)

         // const count = await detectPeople(full)
        try {
          const count = await detectPeople(frameFile)
        } catch (e) {
          console.log("❌ YOLO ERROR", e.message)
          return
        }

          results.push(count)
        }

        res.json({
          totalFrames: results.length,
          avg: results.reduce((a,b)=>a+b,0) / results.length,
          max: Math.max(...results),
          data: results
        })

      } catch (e) {
        console.log("❌ analyze error", e)
        res.status(500).json({ error: e.message })
      }
    }

    if (req.url.startsWith("/api/live/jpeg")) {

      const url = new URL(req.url, "http://localhost")
      const camId = url.searchParams.get("cam")

      const buffer = latestFrames[camId]

      if (!buffer) {
        res.writeHead(404)
        return res.end()
      }

      res.writeHead(200, {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-cache"
      })

      res.end(buffer)
      return
    }

// export
    if (req.url.startsWith("/api/people/export")) {

      const u = new URL(req.url, "http://localhost")

      const camId = u.searchParams.get("camId")
      const from = new Date(u.searchParams.get("from")).getTime()
      const to = new Date(u.searchParams.get("to")).getTime() + 86400000

      const file = path.join(process.cwd(), "data/people/log.csv")

      if (!fs.existsSync(file)) {
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify([]))
        return
      }

      const lines = fs.readFileSync(file, "utf-8").trim().split("\n")

      const result = []

      for (const line of lines) {
        const [ts, cid, count] = line.split(",")

        if (camId && cid !== camId) continue

        const t = Number(ts)

        if (t < from || t > to) continue

        result.push({
          ts: t,
          count: Number(count)
        })
      }

      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(result))
      return
    }

    // people
    if(url === "/api/people"){
      res.writeHead(200, { "Content-Type":"application/json" })
      res.end(JSON.stringify(getCounts()))
      return
    }
   // peopleイベントログ AOA
    if (req.url.startsWith("/api/export/events")) {

      db.all(
        "SELECT * FROM people_events ORDER BY ts ASC",
        (err, rows) => {

          res.writeHead(200, {
            "Content-Type": "application/json"
          })

          res.end(JSON.stringify(rows))
        }
      )

      return
    }
    
    // ダッシュボード用集計API AOA
    if (req.url.startsWith("/api/summary")) {

      res.writeHead(200, {
        "Content-Type": "application/json"
      })

      res.end(JSON.stringify(buckets))
      return
    }
    // =================
    // Static files
    // =================

    const filePath =
    path.join(dist, req.url)

    if(fs.existsSync(filePath) &&
       fs.statSync(filePath).isFile()){

      const ext =
      path.extname(filePath)

      const types = {
        ".html":"text/html",
        ".js":"application/javascript",
        ".css":"text/css",
        ".png":"image/png",
        ".svg":"image/svg+xml"
      }

      res.writeHead(200,{
        "Content-Type": types[ext] || "text/plain"
      })

      res.end(fs.readFileSync(filePath))
      return
    }
//////////MQTT TEST/////////////////////////////////////////
    // MQTTイベント集計API AOA 時系列集計
   if (req.url.startsWith("/api/events-agg-timeseries")) {
      const url = new URL(req.url, "http://localhost")

      const from = new Date(url.searchParams.get("from")).getTime()
      const to = new Date(url.searchParams.get("to")).getTime()
      const unit = url.searchParams.get("unit") || "hour"

      const events = global.crossEvents || []
      const buckets = {}

      function makeKey(ts) {
        const d = new Date(ts)

        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, "0")
        const dd = String(d.getDate()).padStart(2, "0")
        const hh = String(d.getHours()).padStart(2, "0")
        const mi = String(d.getMinutes()).padStart(2, "0")

        if (unit === "minute") return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
        return `${yyyy}-${mm}-${dd} ${hh}:00`
      }

      function emptyRow(time) {
        return {
          time,
          human_in: 0,
          human_out: 0,
          car_in: 0,
          car_out: 0,
          bike_in: 0,
          bike_out: 0,
          bus_in: 0,
          bus_out: 0,
          truck_in: 0,
          truck_out: 0
        }
      }

      for (const e of events) {
        const ts = Number(e.ts)
        if (isNaN(ts)) continue
        if (ts < from || ts > to) continue
        if (e.mode !== "cross") continue

        const key = makeKey(ts)
        if (!buckets[key]) buckets[key] = emptyRow(key)

        const dir = e.direction === "OUT" ? "out" : "in"
        const field = `${e.type}_${dir}`

        if (field in buckets[key]) {
          buckets[key][field] += Number(e.value || 0)
        }
      }

      const result = Object.values(buckets).sort((a, b) =>
        a.time.localeCompare(b.time)
      )

      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(result))
      return
    }

    // MQTTイベント集計API AOA 時間範囲集計
    if (req.url.startsWith("/api/events-agg-range")) {
      const url = new URL(req.url, "http://localhost")

      const from = new Date(url.searchParams.get("from")).getTime()
      const to = new Date(url.searchParams.get("to")).getTime()

      const events = global.crossEvents || []

      const summary = {
        human: { IN: 0, OUT: 0 },
        car: { IN: 0, OUT: 0 },
        bike: { IN: 0, OUT: 0 },
        bus: { IN: 0, OUT: 0 },
        truck: { IN: 0, OUT: 0 }
      }

      for (const e of events) {
        const ts = Number(e.ts)
        if (isNaN(ts)) continue
        if (ts < from || ts > to) continue
        if (e.mode !== "cross") continue
        if (!summary[e.type]) continue

        const dir = e.direction === "OUT" ? "OUT" : "IN"
        summary[e.type][dir] += Number(e.value || 0)
      }

      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ summary }))
      return
    }
    // MQTTイベント受信API AOA AREAイベント受信
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

    // SPA fallback ////////////////////////////////////
    if (res.headersSent) return   
      const indexFile = path.join(dist,"index.html")

    res.writeHead(200,{
      "Content-Type":"text/html"
    })

    res.end(fs.readFileSync(indexFile))
   
  })

  server.listen(PORT,"0.0.0.0",()=>{

    console.log(
      "Web UI:",
      `http://${LOCAL_IP}:${PORT}`
    )

  })

}

module.exports = { startWebApiServer }