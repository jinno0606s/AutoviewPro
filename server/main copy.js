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

const LOCAL_IP = getLocalIP()

console.log("Web API:",`http://${LOCAL_IP}:8080`)
console.log("MAPBOX_TOKEN =", process.env.MAPBOX_TOKEN)

// ======================
// DB
// ======================

const dbDir = path.join(process.env.HOME, ".config/autoview")
fs.mkdirSync(dbDir, { recursive: true })

const db = new sqlite3.Database(path.join(dbDir, "cameras.db"))

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
        lng REAL
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


// ======================
// Window
// ======================

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
/*
ipcMain.handle("get-events", async (e, payload = {}) => {
  try {
    const limit = Number(payload.limit || 100)
    return await listEvents(db, limit)
  } catch (err) {
    console.error("get-events error:", err)
    return []
  }
})
*/
// map location lng=================_===========
//let tempLocation = null

ipcMain.handle("set-temp-location", async (e, data) => {
  tempLocation = data || null
  return { ok: true }
})

ipcMain.handle("get-temp-location", async () => {
  return tempLocation
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
        1,
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
       SET name=?,rtsp_url=?,address=?,lat=?,lng=?
       WHERE id=?`,
      [
        cam.name,
        cam.rtsp_url,
        cam.address,
        cam.lat,
        cam.lng,
        cam.id
      ],
      err => err ? reject(err) : resolve({ ok: true })
    )
  })
})

ipcMain.handle("set-camera-enabled", async (e, data) => {

  return new Promise((resolve, reject) => {

    db.run(
      `UPDATE cameras SET enabled=? WHERE id=?`,
      [data.enabled, data.id],
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

})

ipcMain.handle("stop-live-test", () => {

  stopPipeline()

  return { ok: true }
})

// ======================
// Web API (QR用)
// ======================
function startWebApiServer(){

  const PORT = 8080

  const server = http.createServer(async (req,res)=>{

    // API
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

    // PC UI
    if (req.url === "/mobile") {

    res.writeHead(200,{ "Content-Type":"text/html" })

    res.end(mobileHtml)

    return
    }

    if (req.url === "/" || req.url === "/pc") {

    const file =
    path.join(__dirname,"../uiapp/dist/index.html")

    res.writeHead(200,{
      "Content-Type":"text/html"
    })

    res.end(fs.readFileSync(file))

    return
    }

    res.writeHead(404)
    res.end("Not found")

  })

  server.listen(PORT,"0.0.0.0",()=>{
    console.log("Web API:",
      `http://${LOCAL_IP}:${PORT}`)
  })

}


/*
const server = http.createServer(async (req, res) => {

  // -------------------
  // API
  // -------------------

  if (req.url.startsWith("/api/layout/")) {

    const count = Number(req.url.split("/").pop())

    runLayout(count,10)

    res.writeHead(200)
    res.end("OK")
    return
  }

  if (req.url === "/api/stop") {

    stopPipeline()

    res.writeHead(200)
    res.end("STOP")
    return
  }

  // -------------------
  // Static files (Vue)
  // -------------------

  const dist = path.join(__dirname,"../uiapp/dist")

  const filePath =
    path.join(dist, req.url === "/" ? "index.html" : req.url)

  if (fs.existsSync(filePath)) {

    const ext = path.extname(filePath)

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

  // -------------------
  // Mobile UI
  // -------------------

  if (req.url.startsWith("/mobile")) {

    res.writeHead(200,{
      "Content-Type":"text/html; charset=utf-8"
    })

    res.end(`
<h1>AutoViewPro Mobile</h1>

<button onclick="fetch('/api/layout/1')">1 Camera</button>
<button onclick="fetch('/api/layout/4')">4 Camera</button>
<button onclick="fetch('/api/layout/9')">9 Camera</button>

<button onclick="fetch('/api/stop')">STOP</button>
`)
    return
  }

  // -------------------
  // default
  // -------------------

  res.writeHead(200)
  res.end("AutoViewPro API")

})
*/


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

ipcMain.handle("update-speaker", async (e, data) => {

  console.log("update-speaker:", data)

  return new Promise((resolve, reject) => {

    db.run(
      `UPDATE speakers
       SET name=?, ip=?, rtp_ip=?, address=?, lat=?, lng=?, enabled=?
       WHERE id=?`,
      [
        data.name || "",
        data.ip || "",
        data.rtp_ip || "",
        data.address || "",
        data.lat ?? null,
        data.lng ?? null,
        typeof data.enabled === "number" ? data.enabled : 1,
        data.id
      ],
      function(err) {
        if (err) {
          console.error("update-speaker error:", err)
          reject(err)
        } else {
          console.log("update-speaker ok, changes=", this.changes)
          resolve({ ok: true, changes: this.changes })
        }
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

app.whenReady().then(() => {

  createWindow()
  startWebApiServer()

})

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