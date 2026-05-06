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
const csvPath = path.join(__dirname, "../data/events.csv")

// ★ 先に定義
const BASE = path.join(__dirname, "../runtime")
// const DB = path.join(BASE, "data/cameras.db")

// const DB = "/home/comworks/.config/autoview/cameras.db"
const DB = "/home/comworks/AutoviewPro/runtime/data/cameras.db"
const BACKUP = path.join(BASE, "backup")
const DB_PATH = "/home/comworks/.config/autoview/cameras.db"
console.log("🔥 USING DB:", DB_PATH)

// ★ そのあと使う
if(!fs.existsSync(BASE)){
  fs.mkdirSync(BASE, { recursive:true })
}

if(!fs.existsSync(path.join(BASE, "data"))){
  fs.mkdirSync(path.join(BASE, "data"), { recursive:true })
}

if(!fs.existsSync(BACKUP)){
  fs.mkdirSync(BACKUP, { recursive:true })
}

/*
const ensureDir = (p)=>{
  if(!fs.existsSync(p)){
    fs.mkdirSync(p, { recursive:true })
  }
}

ensureDir(BASE)
ensureDir(path.join(BASE, "data"))
ensureDir(BACKUP)
*/
function readEventsFromCsv() {
  const fs = require("fs")
  const path = require("path")

  const file = path.join(__dirname, "../data/events.csv")
  if (!fs.existsSync(file)) return []

  const lines = fs.readFileSync(file, "utf-8").trim().split("\n")

  return lines.map(l => {
    const p = l.split(",")

    return {
      ts: Number(p[0]),
      serial: p[1],
      scenario: Number(p[2]),
      mode: String(p[3]).trim().toLowerCase(),
      type: String(p[4]).trim().toLowerCase(),
      direction: p[5] === "null" ? null : p[5],
      value: Number(p[6])
    }
  }).filter(e => !isNaN(e.ts))
}

// ファイル上部 or 下部に追加
function sendNoImage(res) {
  const noimg = path.join(__dirname, "../data/noimage.jpg")

  if (!fs.existsSync(noimg)) {
    res.writeHead(200)
    return res.end("NO IMAGE")
  }

  res.writeHead(200, { "Content-Type": "image/jpeg" })
  fs.createReadStream(noimg).pipe(res)
}

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

  //HLS起動処理
  function startHls(cam) {

    const outDir = path.join(__dirname, "../data/hls/" + cam.id)

    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

    const ff = spawn("ffmpeg", [
      "-rtsp_transport", "tcp",
      "-i", cam.rtsp_url,

      "-fflags", "nobuffer",
      "-flags", "low_delay",

      "-an",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-tune", "zerolatency",

      "-f", "hls",
      "-hls_time", "2",
      "-hls_list_size", "3",
      "-hls_flags", "delete_segments",

      path.join(outDir, "index.m3u8")
    ])

    ff.stderr.on("data", d => {
      // console.log("HLS:", d.toString())
    })

    ff.on("close", () => {
      console.log("HLS STOP:", cam.id)
    })

    return ff
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
//////////MQTT webapiserver.js/////////////////////////////////////////
    // MQTTイベント統合集計API
    if (req.url.startsWith("/api/people-summary")) {

      const url = new URL(req.url, "http://localhost")

      const from = new Date(url.searchParams.get("from")).getTime()
      const to   = new Date(url.searchParams.get("to")).getTime()

      const scenarioParam = url.searchParams.get("scenario") || ""
      const scenarios = scenarioParam
        ? scenarioParam.split(",").map(s => Number(s))
        : []

      const events = readEventsFromCsv()

      // ★ 安全：時系列ソート
      events.sort((a, b) => a.ts - b.ts)

      const summary = {
        human: { IN: 0, OUT: 0, AREA: 0 },
        car:   { IN: 0, OUT: 0, AREA: 0 },
        bike:  { IN: 0, OUT: 0, AREA: 0 },
        bus:   { IN: 0, OUT: 0, AREA: 0 },
        truck: { IN: 0, OUT: 0, AREA: 0 }
      }

      // ★ AREAはtypeごとに最新だけ
      const latestArea = {}

      for (const e of events) {

        const ts   = Number(e.ts)
        const mode = String(e.mode || "").toLowerCase()
        const type = String(e.type || "").toLowerCase()

        if (!summary[type]) continue

        // シナリオ
        if (scenarios.length && !scenarios.includes(Number(e.scenario))) continue

        // 時間
        if (!isNaN(from) && ts < from) continue
        if (!isNaN(to) && ts > to) continue

        // ===== CROSS =====
        if (mode === "cross") {
          const dir =
            String(e.direction || "").toUpperCase() === "OUT"
              ? "OUT"
              : "IN"

          summary[type][dir] += Number(e.value || 1)
        }

        // ===== AREA（最新）=====
        if (mode === "area") {
          if (!latestArea[type] || latestArea[type].ts < ts) {
            latestArea[type] = {
              ts,
              value: Number(e.value || 0)
            }
          }
        }
      }

      // ★ AREA反映
      for (const type in latestArea) {
        summary[type].AREA = latestArea[type].value
      }

      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ summary }))
    }

    if (req.url.startsWith("/api/people-timeseries")) {

      const url = new URL(req.url, "http://localhost")

      const from = new Date(url.searchParams.get("from")).getTime()
      const to   = new Date(url.searchParams.get("to")).getTime()
      const cam  = url.searchParams.get("camera") || ""

      const intervalMap = {
        "10m": 600000,
        "1h": 3600000,
        "1d": 86400000
      }

      const interval = intervalMap[url.searchParams.get("interval")] || 600000

      const events = readEventsFromCsv()
      const buckets = {}

      for (const e of events) {

        if (e.mode !== "cross") continue
        if (cam && e.serial !== cam) continue

        if (!isNaN(from) && e.ts < from) continue
        if (!isNaN(to) && e.ts > to) continue

        const keyTime = Math.floor(e.ts / interval) * interval

        if (!buckets[keyTime]) {
          buckets[keyTime] = {
            time: new Date(keyTime).toISOString(),

            human_in: 0, human_out: 0,
            car_in: 0, car_out: 0,
            bike_in: 0, bike_out: 0,
            bus_in: 0, bus_out: 0,
            truck_in: 0, truck_out: 0
          }
        }

        const dir = e.direction === "OUT" ? "out" : "in"
        const key = `${e.type}_${dir}`

        if (buckets[keyTime][key] !== undefined) {
          buckets[keyTime][key] += e.value || 1
        }
      }

      const rows = Object.values(buckets)
        .sort((a, b) => new Date(a.time) - new Date(b.time))

      res.end(JSON.stringify({ data: rows }))
    }

    if (req.url.startsWith("/api/people-area")) {

      const events = readEventsFromCsv()

      const latest = {}

      for (const e of events) {

        if (e.mode !== "area") continue

        const t = e.type

        if (!latest[t] || latest[t].ts < e.ts) {
          latest[t] = { ts: e.ts, value: e.value }
        }
      }

      const result = {}
      for (const k in latest) {
        result[k] = latest[k].value
      }

      res.end(JSON.stringify({ area: result }))
    }

  if (req.url.startsWith("/api/people-timeseries-csv")) {

    const url = new URL(req.url, "http://localhost")

    const from = new Date(url.searchParams.get("from")).getTime()
    const to   = new Date(url.searchParams.get("to")).getTime()
    const cam  = url.searchParams.get("camera") || ""

    const intervalMap = {
      "10m": 600000,
      "1h": 3600000,
      "1d": 86400000
    }

    const interval = intervalMap[url.searchParams.get("interval")] || 600000

    const events = readEventsFromCsv()
    const buckets = {}

    for (const e of events) {

      if (e.mode !== "cross") continue
      if (cam && e.serial !== cam) continue

      if (!isNaN(from) && e.ts < from) continue
      if (!isNaN(to) && e.ts > to) continue

      const keyTime = Math.floor(e.ts / interval) * interval

      if (!buckets[keyTime]) {
        buckets[keyTime] = {
          time: new Date(keyTime).toISOString(),
          human_in: 0, human_out: 0,
          car_in: 0, car_out: 0,
          bike_in: 0, bike_out: 0
        }
      }

      const dir = e.direction === "OUT" ? "out" : "in"
      const key = `${e.type}_${dir}`

      if (buckets[keyTime][key] !== undefined) {
        buckets[keyTime][key] += e.value || 1
      }
    }

    const rows = Object.values(buckets)
      .sort((a, b) => new Date(a.time) - new Date(b.time))

    let csv = "time,human_in,human_out,car_in,car_out,bike_in,bike_out\n"

    for (const r of rows) {
      csv += `${r.time},${r.human_in},${r.human_out},${r.car_in},${r.car_out},${r.bike_in},${r.bike_out}\n`
    }

    res.writeHead(200, { "Content-Type": "text/csv" })
    res.end(csv)
  }
        
    // /api/cross-summary
    if (req.url.startsWith("/api/cross-summary")) {

      const url = new URL(req.url, "http://localhost")

      const from = new Date(url.searchParams.get("from")).getTime()
      const to   = new Date(url.searchParams.get("to")).getTime()

      // シナリオ指定（例: 1,2）
      const scenarioParam = url.searchParams.get("scenario") || "1,2"
      const scenarios = scenarioParam.split(",").map(s => Number(s))

      const events = readEventsFromCsv()

      const summary = {
        human: { IN: 0, OUT: 0 },
        car:   { IN: 0, OUT: 0 },
        bike:  { IN: 0, OUT: 0 },
        bus:   { IN: 0, OUT: 0 },
        truck: { IN: 0, OUT: 0 }
      }

      for (const e of events) {

        // 条件
        if (e.mode !== "cross") continue
        if (!scenarios.includes(Number(e.scenario))) continue
        if (e.ts < from || e.ts > to) continue
        if (!summary[e.type]) continue

        const dir = e.direction === "OUT" ? "OUT" : "IN"

        summary[e.type][dir] += Number(e.value || 0)
      }

      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ summary }))
    }

    // /api/area-current
    if (req.url.startsWith("/api/area-current")) {

      const url = new URL(req.url, "http://localhost")

      const scenarioParam = url.searchParams.get("scenario") || "6"
      const scenarios = scenarioParam.split(",").map(s => Number(s))

      const events = readEventsFromCsv()

      let latest = {}

      for (const e of events) {

        if (e.mode !== "area") continue
        if (!scenarios.includes(Number(e.scenario))) continue

        // 最新だけ保持
        if (!latest[e.type] || latest[e.type].ts < e.ts) {
          latest[e.type] = e
        }
      }

      const result = {}

      for (const type in latest) {
        result[type] = latest[type].value
      }

      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(result))
    }

    // /api/area-summary
    if (req.url.startsWith("/api/area-summary")) {

      const url = new URL(req.url, "http://localhost")

      const from = new Date(url.searchParams.get("from")).getTime()
      const to   = new Date(url.searchParams.get("to")).getTime()

      const scenarioParam = url.searchParams.get("scenario") || "4,6"
      const scenarios = scenarioParam.split(",").map(s => Number(s))

      const events = readEventsFromCsv()

      const sum = {}
      const count = {}

      for (const e of events) {

        if (e.mode !== "area") continue
        if (!scenarios.includes(Number(e.scenario))) continue
        if (e.ts < from || e.ts > to) continue

        if (!sum[e.type]) {
          sum[e.type] = 0
          count[e.type] = 0
        }

        sum[e.type] += Number(e.value || 0)
        count[e.type]++
      }

      const result = {}

      for (const type in sum) {
        result[type] = Math.round(sum[type] / count[type])
      }

      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(result))
    }

    // =================
    // 🌊 海岸監視 放送API
    // =================
    if (req.url.startsWith("/api/coastal/broadcast")) {

      let body = ""

      req.on("data", chunk => {
        body += chunk
      })

      req.on("end", () => {
        try {
          const data = JSON.parse(body)

          console.log("📢 海岸放送:", data.type)

          // ★ここで後で speaker.js 呼ぶ
          // playSpeakerClip(...) とか

          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ ok: true }))

        } catch (e) {
          console.error("coastal error", e)
          res.writeHead(500)
          res.end()
        }
      })

      return
    }

    // =================
    // 📸 スナップショット
    // =================
    // =================
    // 📸 スナップショット
    // =================
    if (req.url.startsWith("/snapshot/")) {

      const id = req.url.split("/").pop().split("?")[0]

      const cam = await dbGet("SELECT * FROM cameras WHERE id=?", [id])

      const tmpFile = path.join(__dirname, "../data/tmp_" + id + ".jpg")

      // 🔥 ① カメラ無効でも404にしない
      if (!cam || !cam.rtsp_url) {
        return sendNoImage(res)
      }

      const ff = spawn("ffmpeg", [
        "-y",
        "-rtsp_transport", "tcp",
        "-i", cam.rtsp_url,
        "-frames:v", "1",
        "-q:v", "2",
        tmpFile
      ])

      ff.on("close", () => {

        // 🔥 ② ffmpeg失敗でも404にしない
        if (!fs.existsSync(tmpFile)) {
          return sendNoImage(res)
        }

        res.writeHead(200, { "Content-Type": "image/jpeg" })
        fs.createReadStream(tmpFile).pipe(res)
      })

      return
    }
    
    /*
    if (req.url.startsWith("/snapshot/")) {

      const id = req.url.split("/").pop().split("?")[0]

      const cam = await dbGet("SELECT * FROM cameras WHERE id=?", [id])

      if (!cam || !cam.rtsp_url) {
        res.writeHead(404)
        return res.end("NO CAMERA")
      }

      const tmpFile = path.join(__dirname, "../data/tmp_" + id + ".jpg")

      const ff = spawn("ffmpeg", [
        "-y",
        "-rtsp_transport", "tcp",
        "-i", cam.rtsp_url,
        "-frames:v", "1",
        "-q:v", "2",
        tmpFile
      ])

      ff.on("close", () => {

        if (!fs.existsSync(tmpFile)) {
          res.writeHead(500)
          return res.end("ERR")
        }

        res.writeHead(200, { "Content-Type": "image/jpeg" })
        fs.createReadStream(tmpFile).pipe(res)
      })

      return
    }
    */
    //配信
    if (req.url.startsWith("/hls/")) {

      const file = path.join(__dirname, "../data", req.url)

      if (!fs.existsSync(file)) {
        res.writeHead(404)
        return res.end()
      }

      const ext = path.extname(file)

      const type =
        ext === ".m3u8" ? "application/vnd.apple.mpegurl" :
        ext === ".ts" ? "video/mp2t" :
        "application/octet-stream"

      res.writeHead(200, { "Content-Type": type })
      fs.createReadStream(file).pipe(res)
      return
    }

    //■ 状態取得
    if(req.url === "/api/system/status"){
      const cams = await dbAll("SELECT COUNT(*) as c FROM cameras")
      const sp = await dbAll("SELECT COUNT(*) as c FROM speakers")

      res.end(JSON.stringify({
        dbPath: DB,
        cameras: cams[0].c,
        speakers: sp[0].c
      }))
      return
    }
    
    //■ バックアップ
/*
    if(req.url === "/api/system/backup" && req.method === "POST"){

      try{

        if(!fs.existsSync(DB)){
          console.error("DB NOT FOUND:", DB)
          res.writeHead(500)
          return res.end("DB NOT FOUND")
        }

        const file = path.join(BACKUP, `backup_${Date.now()}.db`)
        fs.copyFileSync(DB, file)

        res.end("OK")

      }catch(e){

        console.error("BACKUP ERROR:", e)
        res.writeHead(500)
        res.end("ERROR")

      }

      return
    }
*/
    if(req.url === "/api/system/backup" && req.method === "POST"){

      try{

        console.log("DB =", DB)

        if(!fs.existsSync(DB)){
          console.error("❌ DB NOT FOUND:", DB)
          res.writeHead(500)
          return res.end("DB NOT FOUND")
        }

        const file = path.join(BACKUP, `backup_${Date.now()}.db`)

        console.log("SAVE TO =", file)

        fs.copyFileSync(DB, file)

        console.log("✅ BACKUP OK")

        res.end("OK")

      }catch(e){

        console.error("🔥 BACKUP ERROR:", e)

        res.writeHead(500)
        res.end(e.message)   // ←これ重要

      }

      return
    }

    // ■ バックアップ一覧
    if(req.url === "/api/system/backups"){
      const list = fs.readdirSync(BACKUP)
      res.end(JSON.stringify(list))
      return
    }

 /*   
    // ■ 初期化（カメラ＋スピーカー）
    if(req.url === "/api/system/init" && req.method === "POST"){

      await dbRun("DROP TABLE IF EXISTS cameras")
      await dbRun("DROP TABLE IF EXISTS speakers")

      await dbRun(`
        CREATE TABLE cameras (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          rtsp_url TEXT,
          name TEXT,
          address TEXT,
          lat REAL,
          lng REAL,
          enabled INTEGER DEFAULT 1,
          people_count_enabled INTEGER DEFAULT 0,
          people_count_type TEXT DEFAULT 'ai'
        )
      `)

      await dbRun(`
        CREATE TABLE speakers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          rtp_ip TEXT,
          address TEXT,
          lat REAL,
          lng REAL
        )
      `)

      res.end("OK")
      return
    }

    //■ 完全初期化
    if(req.url === "/api/system/init-all" && req.method === "POST"){

      fs.rmSync(path.join(BASE, "data"), { recursive:true, force:true })
      fs.mkdirSync(path.join(BASE, "data"), { recursive:true })

      res.end("OK")
      return
    }

    //■ 復元
    if(req.url === "/api/system/restore" && req.method === "POST"){

      let body=""
      req.on("data", c=> body+=c)

      req.on("end", ()=>{

        const { file } = JSON.parse(body)

        const src = path.join(BACKUP, file)

        if(fs.existsSync(src)){
          fs.copyFileSync(src, DB)
          res.end("OK")
        }else{
          res.writeHead(404)
          res.end("NOT FOUND")
        }

      })

      return
    }
*/

    if(req.url === "/api/system/init" && req.method === "POST"){

      await dbRun("DROP TABLE IF EXISTS cameras")
      await dbRun("DROP TABLE IF EXISTS speakers")

      // ===== cameras =====
      await dbRun(`
        CREATE TABLE cameras (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          rtsp_url TEXT,
          name TEXT,
          address TEXT,
          lat REAL,
          lng REAL,
          enabled INTEGER DEFAULT 1,

          people_count_enabled INTEGER DEFAULT 0,
          people_count_type TEXT DEFAULT 'ai',

          timelapse_enabled INTEGER DEFAULT 0,
          tl_interval INTEGER DEFAULT 600,
          tl_start_hour INTEGER DEFAULT 0,
          tl_end_hour INTEGER DEFAULT 24,
          tl_days TEXT DEFAULT '1,2,3,4,5,6,0',

          scenario1 TEXT,
          scenario2 TEXT,
          serial TEXT
        )
      `)

      // ===== speakers =====
      await dbRun(`
        CREATE TABLE speakers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          ip TEXT,
          address TEXT,
          lat REAL,
          lng REAL,
          enabled INTEGER DEFAULT 1
        )
      `)

      res.end("OK")
      return
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
