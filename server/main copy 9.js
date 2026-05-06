const { app, BrowserWindow, ipcMain } = require("electron")
const path = require("path")
const fs = require("fs")
const sqlite3 = require("sqlite3").verbose()
const http = require("http")
const url = require("url")

const {
  startPipeline,
  switchPipeline,
  stopPipeline,
  gstIsRunning
} = require("../core/pipeline")
/*
const { startCompositor } = require("../core/compositor")

app.whenReady().then(()=>{

createWindow()

startCompositor()

})
*/
let win
let sequenceTimer = null
let sequenceRunning = false
let pageIndex = 0

const dbDir = path.join(process.env.HOME, ".config/autoview")
fs.mkdirSync(dbDir, { recursive: true })

const db = new sqlite3.Database(path.join(dbDir, "cameras.db"))

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  })
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))
  })
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err)
      else resolve(this)
    })
  })
}

async function fetchEnabledCameras() {
  return await dbAll(
    `SELECT id, name, rtsp_url, address, lat, lng
     FROM cameras
     WHERE enabled = 1
       AND rtsp_url IS NOT NULL
       AND rtsp_url <> ''
     ORDER BY id`
  )
}

async function getCamera(id) {
  return await dbGet(
    `SELECT id, name, rtsp_url, address, lat, lng
     FROM cameras
     WHERE id = ?`,
    [id]
  )
}

function stopSequenceInternal() {
  sequenceRunning = false
  pageIndex = 0

  if (sequenceTimer) {
    clearTimeout(sequenceTimer)
    sequenceTimer = null
  }
}

function makeItems(cams, count) {
  const items = cams
    .slice(0, count)
    .map(c => ({
      url: c.rtsp_url,
      name: c.name
    }))

  while (items.length < count) {
    items.push(null)
  }

  return items
}

async function runLayout(count,seconds){

  const cams = await fetchEnabledCameras()

  if(cams.length <= count){

    const items = makeItems(cams,count)

    startPipeline(items,count)

    return
  }

  sequenceRunning = true
  pageIndex = 0

  const run = async ()=>{

    const start = pageIndex * count

    let page = cams.slice(start,start+count)

    if(page.length === 0){
      pageIndex = 0
      page = cams.slice(0,count)
    }

    const items = makeItems(page,count)

    switchPipeline(items,count)

    pageIndex++

    if(pageIndex * count >= cams.length){
      pageIndex = 0
    }

    if(sequenceRunning){
      sequenceTimer = setTimeout(run, seconds*1000)
    }

  }

  run()

}

/*
async function runLayout(count, seconds = 10) {
  const cams = await fetchEnabledCameras()
  const camCount = cams.length

  stopSequenceInternal()

  if (camCount <= count || count === 1) {
    const items = makeItems(cams, count)

    if (gstIsRunning()) switchPipeline(items, count)
    else startPipeline(items, count)

    return { ok: true, sequence: false, cams: camCount, layout: count }
  }

  sequenceRunning = true
  pageIndex = 0

  const run = async () => {
    if (!sequenceRunning) return

    const start = pageIndex * count
    let page = cams.slice(start, start + count)

    if (page.length === 0) {
      pageIndex = 0
      page = cams.slice(0, count)
    }

    const items = makeItems(page, count)

    if (gstIsRunning()) switchPipeline(items, count)
    else startPipeline(items, count)

    pageIndex++
    if (pageIndex * count >= camCount) pageIndex = 0

    if (sequenceRunning) {
      sequenceTimer = setTimeout(run, seconds * 1000)
    }
  }

  await run()

  return { ok: true, sequence: true, cams: camCount, layout: count, seconds }
}
*/
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

function startWebApiServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const parsed = url.parse(req.url, true)
      const pathname = parsed.pathname || "/"

      res.setHeader("Access-Control-Allow-Origin", "*")
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
      res.setHeader("Access-Control-Allow-Headers", "Content-Type")

      if (req.method === "OPTIONS") {
        res.writeHead(204)
        res.end()
        return
      }

      if (pathname === "/api/cameras") {
        const rows = await dbAll(
          `SELECT id, name, rtsp_url, enabled, address, lat, lng
           FROM cameras
           ORDER BY id`
        )
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" })
        res.end(JSON.stringify(rows))
        return
      }

      if (pathname === "/api/map-cameras") {
        const rows = await dbAll(
          `SELECT id, name, address, lat, lng
           FROM cameras
           WHERE enabled = 1
             AND lat IS NOT NULL
             AND lng IS NOT NULL
           ORDER BY id`
        )
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" })
        res.end(JSON.stringify(rows))
        return
      }

      if (pathname.startsWith("/api/layout/")) {
        const count = Number(pathname.split("/").pop() || 1)
        const seconds = Number(parsed.query.seconds || 10)
        const result = await runLayout(count, seconds)
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" })
        res.end(JSON.stringify(result))
        return
      }

      if (pathname.startsWith("/api/camera/") && pathname.endsWith("/show")) {
        const parts = pathname.split("/")
        const id = Number(parts[3])
        const cam = await getCamera(id)

        if (!cam || !cam.rtsp_url) {
          res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" })
          res.end(JSON.stringify({ ok: false, error: "camera not found" }))
          return
        }

        stopSequenceInternal()

        const items = [{ url: cam.rtsp_url, name: cam.name }]
        if (gstIsRunning()) switchPipeline(items, 1)
        else startPipeline(items, 1)

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" })
        res.end(JSON.stringify({ ok: true, id: cam.id, name: cam.name }))
        return
      }

      if (pathname === "/api/stop") {
        stopSequenceInternal()
        stopPipeline()
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" })
        res.end(JSON.stringify({ ok: true }))
        return
      }

      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" })
      res.end(JSON.stringify({ ok: false, error: "not found" }))
    } catch (err) {
      console.error("API error:", err)
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" })
      res.end(JSON.stringify({ ok: false, error: err.message }))
    }
  })

  server.listen(8080, "0.0.0.0", () => {
    console.log("Web API: http://<NUC-IP>:8080")
  })
}

app.whenReady().then(() => {
  createWindow()
  startWebApiServer()
})

ipcMain.handle("start-layout", async (_e, payload) => {
  const count = Number(payload.count || 1)
  const seconds = Math.max(1, Number(payload.seconds || 10))
  return await runLayout(count, seconds)
})

ipcMain.handle("stop-sequence", async () => {
  stopSequenceInternal()
  return { ok: true }
})

ipcMain.handle("stop-stream", async () => {
  stopSequenceInternal()
  stopPipeline()
  return { ok: true }
})

ipcMain.handle("get-cameras", async () => {
  return await dbAll(`SELECT * FROM cameras ORDER BY id`)
})

ipcMain.handle("save-camera", async (_e, cam) => {
  const r = await dbRun(
    `INSERT INTO cameras (name, rtsp_url, enabled, address, lat, lng)
     VALUES (?, ?, 1, ?, ?, ?)`,
    [cam.name, cam.rtsp_url, cam.address || "", cam.lat ?? null, cam.lng ?? null]
  )
  return { id: r.lastID }
})

ipcMain.handle("update-camera", async (_e, cam) => {
  await dbRun(
    `UPDATE cameras
     SET name = ?, rtsp_url = ?, address = ?, lat = ?, lng = ?
     WHERE id = ?`,
    [cam.name, cam.rtsp_url, cam.address || "", cam.lat ?? null, cam.lng ?? null, cam.id]
  )
  return { ok: true }
})

ipcMain.handle("set-camera-enabled", async (_e, data) => {
  await dbRun(
    `UPDATE cameras SET enabled = ? WHERE id = ?`,
    [data.enabled, data.id]
  )
  return { ok: true }
})

ipcMain.handle("start-live-test", async (_e, payload) => {
  stopSequenceInternal()

  const url = String(payload?.url || "").trim()
  const name = String(payload?.name || "TEST").trim()

  if (!url) return { ok: false }

  if (gstIsRunning()) switchPipeline([{ url, name }], 1)
  else startPipeline([{ url, name }], 1)

  return { ok: true }
})

ipcMain.handle("stop-live-test", async () => {
  stopSequenceInternal()
  stopPipeline()
  return { ok: true }
})

app.on("before-quit", () => {
  stopSequenceInternal()
  stopPipeline()
})

ipcMain.handle("show-camera", async (e,id)=>{

  const cam = await dbGet(
    "SELECT id,name,rtsp_url FROM cameras WHERE id=?",
    [id]
  )

  if(!cam) return

  stopSequenceInternal()

  const items=[{
    url:cam.rtsp_url,
    name:cam.name
  }]

  if(gstIsRunning()){
    switchPipeline(items,1)
  }else{
    startPipeline(items,1)
  }

})

ipcMain.handle("speaker-test", async (e,ip,port)=>{

spawn("gst-launch-1.0",[
"audiotestsrc",
"!",
"mulawenc",
"!",
"rtppcmupay",
"!",
`udpsink`,
`host=${ip}`,
`port=${port}`
])

})