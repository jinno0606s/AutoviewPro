const http = require("http")
const fs = require("fs")
const path = require("path")
const { runTimelapse } = require("../core/timelapse.js")

function startWebApiServer(ctx){

  const {
    dbAll,
    dbGet,
    runLayout,
    stopPipeline,
    startPipeline,
    playSpeakerClip,
    LOCAL_IP
  } = ctx

  const PORT = 8080

  const dist =
  path.join(__dirname,"../uiapp/dist")

  const server = http.createServer(async (req,res)=>{

    // =================
    // API
    // =================
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
   
    // ==========================
// タイムラプス実行
// ==========================
  if(req.url === "/api/timelapse/run" && req.method === "POST"){

    let body = ""

    req.on("data", chunk => body += chunk)

    req.on("end", async ()=>{

      try{

        const data = body ? JSON.parse(body) : {}

        const ctx2 = {
          camera: {
            id: data.camera_id || 1
          },
          now: new Date()
        }

        const events = await runTimelapse(ctx2)

        console.log("TIMELAPSE EVENT:", events)

        res.writeHead(200,{
          "Content-Type":"application/json"
        })

        res.end(JSON.stringify(events))

      }catch(e){

        console.error("timelapse error:", e)

        res.writeHead(500)
        res.end(JSON.stringify({ ok:false }))
      }

    })

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


    // SPA fallback

    const indexFile =
    path.join(dist,"index.html")

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