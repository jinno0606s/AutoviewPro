//　timelapse.js
const { execFileSync } = require("child_process")
const fs = require("fs")
const path = require("path")
const state = require("./state")
//const speed = Number(u.searchParams.get("speed") || 1)
//const result = buildVideoFromRange(cam, from, to, fps, speed)
/*
if(typeof runTimelapse === "function"){
  runTimelapse(cam)
}
*/
if(!state.manualRun){
  return
}

function ensureDir(dir){
  if(!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true })
  }
}

//function buildVideoFromRange(camera, from, to, fps = 12, speed = 1)



function getCameraFolder(camera){
  const baseDir = "./data/timelapse"

  const safeName =
    String(camera.name || `camera_${camera.id}`)
      .replace(/[\\/:*?"<>|]/g, "_")
      .trim()

  return path.join(baseDir, safeName)
}

function buildVideoFromRange(camera, from, to, fps = 12, speed = 1){
  // ここに処理
}
/*
module.exports = {
  getCameraFolder,
  buildVideoFromRange
}
*/

function sendAlert(cam){
  console.log("🚨 CAMERA ERROR:", cam.name || cam.id)
}

async function runTimelapse(ctx){
  const { camera } = ctx

  if(!camera || !camera.rtsp_url){
    console.log("NO RTSP URL")
    return []
  }

  const dir = getCameraFolder(camera)
  ensureDir(dir)

  const filename = `${Date.now()}.jpg`
  const filePath = path.join(dir, filename)

  try{
      execFileSync("ffmpeg", [
        "-y",
        "-rtsp_transport", "tcp",
        "-i", camera.rtsp_url,
        "-frames:v", "1",
        "-vf", "scale=640:-1",   // ←ここに移動
        "-q:v", "2",
        filePath
      ])

/*
      execFileSync("ffmpeg", [
        "-y",
        "-rtsp_transport", "tcp",
        "-i", camera.rtsp_url,
        "-frames:v", "1",
        "-q:v", "2",
        filePath
      ], { stdio: "inherit" })
*/

    const stat = fs.statSync(filePath)

    if(stat.size < 10000){
      fs.unlinkSync(filePath)
      throw new Error("BAD IMAGE")
    }

    console.log("TIMELAPSE SAVE:", filePath)

    return [{
      type: "TIMELAPSE_CAPTURED",
      level: "info",
      camera_id: camera.id,
      meta: { file: filePath, size: stat.size }
    }]

  }catch(e){
    console.log("TIMELAPSE FAIL:", camera.id, e.message)

    return [{
      type: "TIMELAPSE_ERROR",
      level: "error",
      camera_id: camera.id,
      meta: { error: e.message }
    }]
  }
}

module.exports = {
  runTimelapse,
  sendAlert,
  getCameraFolder,
  buildVideoFromRange
}