// core/timelapse.js

const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

async function runTimelapse(ctx){

  const { camera } = ctx

  // 保存フォルダ
  const dir = `./data/timelapse/camera_${camera.id}`

  if(!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true })
  }

  // ファイル名
  const filename = `${Date.now()}.jpg`
  const filePath = path.join(dir, filename)

  // RTSP → JPEG
  const cmd = `ffmpeg -y -i ${camera.rtsp_url} -frames:v 1 ${filePath}`

  execSync(cmd)

  console.log("TIMELAPSE SAVE:", filePath)

  return [{
    type: "TIMELAPSE_CAPTURED",
    level: "info",
    camera_id: camera.id,
    meta: {
      file: filePath
    }
  }]
}

module.exports = { runTimelapse }