// main.js
const { app, BrowserWindow, ipcMain } = require("electron")
const { spawn } = require("child_process")
const path = require("path")
const fs = require("fs")
const sqlite3 = require("sqlite3").verbose()
const http = require("http")
const https = require("https")
const publicDir =
 path.join(__dirname,"../uiapp/dist")
require("dotenv").config()
const { runTimelapse, sendAlert } = require("../core/timelapse")
const { initPeopleCount } = require("../core/peopleCount")

const ENABLE_EVENT = process.env.ENABLE_EVENT === "true"
const ENABLE_PEOPLE = process.env.ENABLE_PEOPLE === "true"
let db = null
let dbPath = null   
const aoaLive = {}

/////////////////////////////////////////////////

const {
  startPipeline,
  switchPipeline,
  stopPipeline,
  gstIsRunning
} = require("../core/pipeline")

const {
  createEvent,
  closeEvent,
  listEvents,
  getOpenEvents,
  saveRule,
  updateRule,
  listRules,
  saveClip,
  updateClip,
  listClips,
  playSpeakerClip
} = require("./eventSystem")

let win
let sequenceTimer = null
let sequenceRunning = false
let pageIndex = 0
let tempLocation = null  //map

const token = process.env.MAPBOX_TOKEN
const os = require("os")

const LOCAL_IP = getLocalIP()

const { startTimelapse } = require("../core/timelapse")
const WebSocket = require("ws")

const wss = new WebSocket.Server({ port: 8090 })

global.wsClients = []

wss.on("connection", (ws) => {
  console.log("🟢 WS CONNECT")

  global.wsClients.push(ws)

  ws.on("close", () => {
    global.wsClients = global.wsClients.filter(c => c !== ws)
  })
})

async function init() {

  // ① DBパス
  dbPath = process.env.DB_PATH || "/home/comworks/.config/autoview/cameras.db"
  console.log("DB PATH:", dbPath)

  // ② DB接続
  db = new sqlite3.Database(dbPath)

  // ③ DB関数
  global.dbAll = (sql, params=[]) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
  }

  // ④ カメラ取得
  const cameras = await dbAll("SELECT * FROM cameras")
  console.log("📷 CAMS =", cameras)

  // ⑤ PeopleCount
  if (process.env.ENABLE_PEOPLE === "true") {
    require("../core/peopleCount")
  }

  // ⑥ Timelapse
  if (process.env.ENABLE_TIMELAPSE === "true") {
    startTimelapse(cameras)
  }

}

// 🔥 これ1回だけ
init()

/*
async function init() {

  const cameras = await dbAll("SELECT * FROM cameras")

  if (process.env.ENABLE_PEOPLE === "true") {
    startYoloCount(cameras)
  }

  if (process.env.ENABLE_TIMELAPSE === "true") {
    startTimelapse(cameras)
  }
}

init()
*/
function initDb() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS cameras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        rtsp_url TEXT,
        enabled INTEGER DEFAULT 1,
        address TEXT,
        lat REAL,
        lng REAL,

        -- タイムラプス
        timelapse_enabled INTEGER DEFAULT 1,
        tl_interval INTEGER DEFAULT 600,
        tl_start_hour INTEGER DEFAULT 0,
        tl_end_hour INTEGER DEFAULT 24,
        tl_days TEXT DEFAULT '0,1,2,3,4,5,6',
        tl_last_run INTEGER DEFAULT 0,
        tl_folder_name TEXT DEFAULT '',
        tl_output_dir TEXT DEFAULT './data/timelapse',
        tl_notify_email TEXT DEFAULT '',
        tl_notify_after_sec INTEGER DEFAULT 1800,
        tl_last_file_at INTEGER DEFAULT 0
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS speakers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        ip TEXT,
        rtp_ip TEXT,
        enabled INTEGER DEFAULT 1,
        address TEXT,
        lat REAL,
        lng REAL
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        level TEXT DEFAULT 'info',
        source TEXT DEFAULT 'manual',
        title TEXT NOT NULL,
        message TEXT DEFAULT '',
        lat REAL,
        lng REAL,
        camera_id INTEGER,
        speaker_id INTEGER,
        zone_id INTEGER,
        status TEXT DEFAULT 'open',
        created_at TEXT DEFAULT (datetime('now','localtime')),
        closed_at TEXT,
        operator TEXT
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        event_type TEXT NOT NULL,
        condition_json TEXT DEFAULT '{}',
        action_json TEXT DEFAULT '{}',
        enabled INTEGER DEFAULT 1
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS clips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        speaker_id INTEGER,
        clip_no INTEGER,
        text TEXT DEFAULT '',
        file_path TEXT DEFAULT '',
        enabled INTEGER DEFAULT 1
      )
    `)
  })
}

/////////webserver//////////////////////////////////////////////////////
const { startWebApiServer } =
require("./webApiServer")

app.whenReady().then(()=>{

  createWindow()

  startWebApiServer({
    db,
    dbAll,
    dbGet,
    dbRun,
    runLayout,
    stopPipeline,
    startPipeline,
    playSpeakerClip,
    LOCAL_IP
  })
  startTimelapseScheduler()
  initPeopleCount() 
})

// IP
function getLocalIP(){

  const nets = os.networkInterfaces()

  for(const name of Object.keys(nets)){
    for(const net of nets[name]){

      if(net.family === "IPv4" && !net.internal){
        return net.address
      }

    }
  }

  return "127.0.0.1"
}

console.log("Web API:",`http://${LOCAL_IP}:8080`)
console.log("MAPBOX_TOKEN =", process.env.MAPBOX_TOKEN)
//console.log("DB PATH:", dbPath)


/* 人数カウント ///////////////////
async function init(){
  db = new sqlite3.Database(dbPath)
  const cameras = await dbAll("SELECT * FROM cameras")
   console.log("📷 CAMS =", cameras)
  startPeopleCount(cameras)
}
*/
//init()
/*
ipcMain.handle("get-people", async () => {
  return getCounts()
})

async function initPeopleCount() {
  const cams = await dbAll(`
    SELECT * FROM cameras
    ORDER BY id
  `)

  console.log("📷 CAMS =", cams)

  // startYoloCount(cams)
}

initPeopleCount()
*/
// ======================
// DB
// ======================

const dbDir = path.join(process.env.HOME, ".config/autoview")
fs.mkdirSync(dbDir, { recursive: true })

//const db = new sqlite3.Database(path.join(dbDir, "cameras.db"))
//onst dbPath = path.join(process.env.HOME, ".config/autoview/cameras.db")
console.log("DB PATH:", dbPath)


function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows))
  })
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row))
  })
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err)
      else resolve(this)
    })
  })
}
// ======================
// Window
// ======================
//const { app, BrowserWindow } = require("electron")

function createWindow() {

  const win = new BrowserWindow({
    width: 1200,
    height: 800,

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.loadURL("http://localhost:8080")
}

app.whenReady().then(createWindow)

/*
function createWindow() {

  win = new BrowserWindow({
    width: 1920,
    height: 1080,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.loadFile(path.join(__dirname, "../uiapp/dist/index.html"))
}
*/

////MAP/////////////////////////////
ipcMain.handle("get-map-cameras", async () => {
  return await dbAll(`
    SELECT id,name,address,lat,lng
    FROM cameras
    WHERE lat IS NOT NULL
      AND lng IS NOT NULL
    ORDER BY id
  `)
})

ipcMain.handle("get-map-speakers", async () => {
  return await dbAll(`
    SELECT id,name,address,lat,lng
    FROM speakers
    WHERE lat IS NOT NULL
      AND lng IS NOT NULL
    ORDER BY id
  `)
})

// map location lng=================_===========
//let tempLocation = null

ipcMain.handle("set-temp-location", async (e, data) => {
  tempLocation = data || null
  return { ok: true }
})

ipcMain.handle("get-temp-location", async () => {
  return tempLocation || null
})

ipcMain.handle("clear-temp-location", async () => {
  tempLocation = null
  return { ok: true }
})

ipcMain.handle("get-camera", async (e, id) => {
  return await dbGet(`SELECT * FROM cameras WHERE id=?`, [id])
})

// ======================
// Cameras
// ======================

async function fetchEnabledCameras() {

  return await dbAll(`
    SELECT id,name,rtsp_url
    FROM cameras
    WHERE enabled=1
    AND rtsp_url IS NOT NULL
    AND rtsp_url <> ''
    ORDER BY id
  `)

}

// ======================
// Sequence Control
// ======================

function stopSequenceInternal() {

  sequenceRunning = false
  pageIndex = 0

  if (sequenceTimer) {
    clearTimeout(sequenceTimer)
    sequenceTimer = null
  }
}

function makeItems(cams, count) {

  const items = cams.slice(0, count).map(c => ({
    url: c.rtsp_url,
    name: c.name
  }))

  while (items.length < count) items.push(null)

  return items
}

async function runLayout(count, seconds = 10) {

  const cams = await fetchEnabledCameras()

  stopSequenceInternal()

  if (cams.length <= count) {

    const items = makeItems(cams, count)

    if (gstIsRunning())
      switchPipeline(items, count)
    else
      startPipeline(items, count)

    return
  }

  sequenceRunning = true
  pageIndex = 0

  const run = () => {

    if (!sequenceRunning) return

    const start = pageIndex * count
    let page = cams.slice(start, start + count)

    if (page.length === 0) {
      pageIndex = 0
      page = cams.slice(0, count)
    }

    const items = makeItems(page, count)

    if (gstIsRunning())
      switchPipeline(items, count)
    else
      startPipeline(items, count)

    pageIndex++

    if (pageIndex * count >= cams.length)
      pageIndex = 0

    sequenceTimer = setTimeout(run, seconds * 1000)
  }

  run()
}

// ======================
// IPC
// ======================

ipcMain.handle("start-layout", async (e, payload) => {

  try {

    const count = Number(payload.count || 1)
    const seconds = Number(payload.seconds || 10)

    await runLayout(count, seconds)

    return { ok: true }

  } catch (err) {
    console.error(err)
    return { ok: false }
  }
})

ipcMain.handle("stop-sequence", () => {

  stopSequenceInternal()

  return { ok: true }
})

ipcMain.handle("stop-stream", () => {

  stopSequenceInternal()
  stopPipeline()

  return { ok: true }
})

// ======================
// Camera CRUD
// ======================

ipcMain.handle("get-cameras", async () => {
  return await dbAll(`SELECT * FROM cameras ORDER BY id`)
})

ipcMain.handle("save-camera", async (e, cam) => {

  return new Promise((resolve, reject) => {

    db.run(
      `INSERT INTO cameras (name,rtsp_url,enabled,address,lat,lng)
       VALUES (?,?,?,?,?,?)`,
      [
        cam.name,
        cam.rtsp_url,
        Number(cam.enabled),
        cam.address || "",
        cam.lat || null,
        cam.lng || null
      ],
      function (err) {
        if (err) reject(err)
        else resolve({ id: this.lastID })
      }
    )
  })
})

ipcMain.handle("update-camera", async (e, cam) => {

  return new Promise((resolve, reject) => {

    db.run(
      `UPDATE cameras
       SET name=?,
           rtsp_url=?,
           address=?,
           lat=?,
           lng=?,
           enabled=?,
           people_count_enabled=?,
           people_count_type=?
       WHERE id=?`,
      [
        cam.name,
        cam.rtsp_url,
        cam.address,
        cam.lat,
        cam.lng,
        Number(cam.enabled),  
        Number(cam.people_count_enabled),
        cam.people_count_type ?? "aoa",
        cam.id
      ],
      err => err ? reject(err) : resolve({ ok: true })
    )
  })
})

// ======================
// Live Test
// ======================

ipcMain.handle('start-live-test', async (e, payload) => {

  if(!payload) return

  const url = payload.url
  const name = payload.name || "TEST"

  if(!url){
    console.log("Invalid RTSP URL")
    return
  }

  await startPipeline([{ url, name }], 1)
/*
  await startPipeline([{
    rtsp_url: url,
    name: name,
    enabled: 1
  }], 1)
*/
})

ipcMain.handle("stop-live-test", () => {

  stopPipeline()

  return { ok: true }
})

// Dashboard camera TEST
ipcMain.handle("startLiveTest", async (e, opt)=>{
  if(opt.target === "right"){
    startPipelineToRight(opt.url)
  }else{
    startPipeline(opt.url)
  }
})


// ======================
// Web API (QR用)
// ======================
// ======================
// APP START
// ======================

app.on("before-quit", () => {

  stopSequenceInternal()
  stopPipeline()

})
// speaker
ipcMain.handle("get-speakers", async () => {

  return await dbAll(`SELECT * FROM speakers ORDER BY id`)

})

ipcMain.handle("save-speaker", async (e,data)=>{

  return new Promise((resolve,reject)=>{

    db.run(
      `INSERT INTO speakers (name,rtp_ip,address,lat,lng)
       VALUES (?,?,?,?,?)`,
      [
        data.name,
        data.rtp_ip,
        data.address,
        data.lat,
        data.lng
      ],
      function(err){

        if(err) reject(err)
        else resolve({id:this.lastID})

      }
    )

  })

})

/*
ipcMain.handle("save-speaker", async (e,data)=>{

  return new Promise((resolve,reject)=>{

    db.run(
      `INSERT INTO speakers (name,ip,address,lat,lng)
       VALUES (?,?,?,?,?)`,
      [
        data.name,
        data.ip,          // ← ここ重要
        data.address,
        data.lat,
        data.lng
      ],
      function(err){

        if(err) reject(err)
        else resolve({id:this.lastID})

      }
    )

  })

})
*/
/*
ipcMain.handle("speaker-test", async (e, data) => {

  const ip = data.ip || data.rtp_ip

  if (!ip) {
    console.error("NO IP")
    return { ok:false }
  }

  const url = `http://${ip}/axis-cgi/mediaclip.cgi?action=play&clip=bell.wav`

  return new Promise((resolve) => {

    http.get(url, res => {
      console.log("PLAY OK", ip)
      resolve({ ok:true })
    }).on("error", err => {
      console.error("PLAY ERR", err)
      resolve({ ok:false })
    })

  })
})
*/
ipcMain.handle("update-speaker", async (e, data) => {

  return new Promise((resolve, reject) => {

    db.run(
      `UPDATE speakers
       SET name=?, ip=?, address=?, lat=?, lng=?
       WHERE id=?`,
      [
        data.name || "",
        data.ip || "",     // ← これだけ
        data.address || "",
        data.lat ?? null,
        data.lng ?? null,
        data.id
      ],
      function(err) {
        if (err) reject(err)
        else resolve({ ok: true })
      }
    )

  })

})

ipcMain.handle("speaker-test", async (e, data) => {

 console.log("=== MAIN SPEAKER TEST ===")
 console.log("DATA =", data)

 try {

   const clipPath = data.file_path || data.clip || "logo.mp3"
   const ip = data.ip || data.rtp_ip

   console.log("IP =", ip)
   console.log("CLIP =", clipPath)

   const result = await playSpeakerClip(ip, clipPath, 3000)

   console.log("PLAY RESULT =", result)

   return result

 } catch (err) {

   console.error("speaker-test error:", err)

   return { ok: false, error: err.message }

 }

})

//const { spawn } = require("child_process")

ipcMain.handle("geocode-address", async (e, address) => {

 const token = process.env.MAPBOX_TOKEN

 const url =
 "https://api.mapbox.com/geocoding/v5/mapbox.places/"
 + encodeURIComponent(address)
 + ".json?limit=1&language=ja&access_token=" + token

 const res = await fetch(url)
 const data = await res.json()

 if(data.features && data.features.length){
   const c = data.features[0].center
   return { ok:true, lat:c[1], lng:c[0] }
 }

 return { ok:false }

})

initDb()

///events////////////////////////////////////////////////////
ipcMain.handle("get-events", async (e, payload = {}) => {
  try {
    const limit = Number(payload.limit || 100)
    return await listEvents(db, limit)
  } catch (err) {
    console.error("get-events error:", err)
    return []
  }
})

ipcMain.handle("get-open-events", async () => {
  try {
    return await getOpenEvents(db)
  } catch (err) {
    console.error("get-open-events error:", err)
    return []
  }
})

ipcMain.handle("create-event", async (e, payload) => {
  try {
    return await createEvent(db, payload)
  } catch (err) {
    console.error("create-event error:", err)
    return { ok: false, error: err.message }
  }
})

ipcMain.handle("close-event", async (e, payload) => {
  try {
    return await closeEvent(
      db,
      payload.id,
      payload.operator || "operator"
    )
  } catch (err) {
    console.error("close-event error:", err)
    return { ok: false, error: err.message }
  }
})

ipcMain.handle("get-rules", async () => {
  try {
    return await listRules(db)
  } catch (err) {
    console.error("get-rules error:", err)
    return []
  }
})

ipcMain.handle("save-rule", async (e, payload) => {
  try {
    return await saveRule(db, payload)
  } catch (err) {
    console.error("save-rule error:", err)
    return { ok: false, error: err.message }
  }
})

ipcMain.handle("update-rule", async (e, payload) => {
  try {
    return await updateRule(db, payload)
  } catch (err) {
    console.error("update-rule error:", err)
    return { ok: false, error: err.message }
  }
})

ipcMain.handle("get-clips", async () => {
  try {
    return await listClips(db)
  } catch (err) {
    console.error("get-clips error:", err)
    return []
  }
})

ipcMain.handle("save-clip", async (e, payload) => {
  try {
    return await saveClip(db, payload)
  } catch (err) {
    console.error("save-clip error:", err)
    return { ok: false, error: err.message }
  }
})

ipcMain.handle("update-clip", async (e, payload) => {
  try {
    return await updateClip(db, payload)
  } catch (err) {
    console.error("update-clip error:", err)
    return { ok: false, error: err.message }
  }
})

ipcMain.handle("get-layout", async ()=>{

 return { count:1 }

})
///////TIMELAPSE/////////////////////////////////////////
//const { runTimelapse, sendAlert } = require("../core/timelapse")

let schedulerStarted = false
let schedulerRunning = false

function startTimelapseScheduler() {
  if (schedulerStarted) {
    console.log("⚠️ timelapse scheduler already started")
    return
  }

  schedulerStarted = true
  console.log("✅ timelapse scheduler started")

  async function loop() {
    if (schedulerRunning) {
      console.log("⏸ scheduler skip: still running")
      setTimeout(loop, 10000)
      return
    }

    schedulerRunning = true

    try {
      const now = new Date()
      const hour = now.getHours()
      const day = now.getDay()
      const nowTime = Date.now()

      console.log("=== TIMELAPSE CHECK ===", hour, day)

      let cams = []
      try {
        cams = await dbAll(`
          SELECT * FROM cameras
          WHERE enabled = 1
            AND timelapse_enabled = 1
          ORDER BY id
        `)
      } catch (e) {
        console.log("DB ERROR:", e.message)
        schedulerRunning = false
        setTimeout(loop, 10000)
        return
      }

      for (const cam of cams) {
        try {
          if (!cam.rtsp_url) continue

          const days = String(cam.tl_days || "0,1,2,3,4,5,6")
            .split(",")
            .map(v => Number(v.trim()))
            .filter(v => !Number.isNaN(v))

          if (!days.includes(day)) continue

          const startHour = Number(cam.tl_start_hour ?? 0)
          const endHour = Number(cam.tl_end_hour ?? 24)
          const interval = Number(cam.tl_interval ?? 600)
          const lastRun = Number(cam.tl_last_run ?? 0)

          if (hour < startHour || hour >= endHour) continue
          if (nowTime - lastRun < interval * 1000) continue

          const events = await runTimelapse({
            camera: cam,
            now
          })

   //       const failed = !events.length || events[0].type === "TIMELAPSE_ERROR"

          cam._failCount = cam._failCount || 0

          const success = events.length > 0 && events[0].type === "TIMELAPSE_CAPTURED"
          const failed = !success

          if (failed) {
            cam._failCount = (cam._failCount || 0) + 1
          } else {
            cam._failCount = 0

            await dbRun(
              `UPDATE cameras SET tl_last_run=?, tl_last_file_at=? WHERE id=?`,
              [nowTime, nowTime, cam.id]
            )
          }

          console.log("SHOT:", cam.id)

          await new Promise(r => setTimeout(r, 500))
        } catch (e) {
          console.log("ERR:", cam.id, e.message)
        }
      }
    } catch (e) {
      console.log("SCHEDULER ERROR:", e.message)
    } finally {
      schedulerRunning = false
      setTimeout(loop, 10000)
    }
  }

  loop()
}
