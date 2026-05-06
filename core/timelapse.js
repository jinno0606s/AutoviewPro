// core/timelapse.js
const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")

function ensureDir(dir){
  if(!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true })
  }
}

function getCameraFolder(camera){
  const baseDir = "./data/timelapse"

  const safeName =
    String(camera.name || `camera_${camera.id}`)
      .replace(/[\\/:*?"<>|]/g, "_")
      .trim()

  return path.join(baseDir, safeName)
}

// 🔥 非同期版（重要）
function captureFrame(rtspUrl, filePath){
  return new Promise((resolve, reject) => {

    const ff = spawn("ffmpeg", [
      "-y",
      "-rtsp_transport", "tcp",
      "-i", rtspUrl,
      "-frames:v", "1",
      "-vf", "scale=640:-1",
      "-q:v", "2",
      filePath
    ])

    let err = ""

    ff.stderr.on("data", d => {
      err += d.toString()
    })

    ff.on("close", code => {
      if(code === 0) resolve(filePath)
      else reject(new Error(err))
    })
  })
}

async function runTimelapse(ctx){
  const { camera } = ctx

  if(!camera || !camera.rtsp_url){
    console.log("NO RTSP URL")
    return []
  }

  const dir = getCameraFolder(camera)
  ensureDir(dir)

  const filePath = path.join(dir, `${Date.now()}.jpg`)

  try{
    await captureFrame(camera.rtsp_url, filePath)

    const stat = fs.statSync(filePath)

    if(stat.size < 10000){
      fs.unlinkSync(filePath)
      throw new Error("BAD IMAGE")
    }

    console.log("📸 TIMELAPSE OK:", camera.id)

    return [{
      type: "TIMELAPSE_CAPTURED",
      camera_id: camera.id
    }]

  }catch(e){
    console.log("❌ TIMELAPSE FAIL:", camera.id, e.message)

    return [{
      type: "TIMELAPSE_ERROR",
      camera_id: camera.id
    }]
  }
}

function sendAlert(cam){
  console.log("🚨 CAMERA ERROR:", cam.name || cam.id)
}

// ✅ exportは1回だけ
module.exports = {
  runTimelapse,
  sendAlert,
  getCameraFolder
}