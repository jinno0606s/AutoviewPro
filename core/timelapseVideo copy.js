// timelapseVideo.js
const fs = require("fs")
const path = require("path")
const { execFileSync } = require("child_process")
const { getCameraFolder } = require("./timelapse")

function ensureDir(dir){
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// 2024-06-01_12-00
function formatDate(ts){
  const d = new Date(ts)

  const yyyy = d.getFullYear()
  const mm = String(d.getMonth()+1).padStart(2,"0")
  const dd = String(d.getDate()).padStart(2,"0")
  const hh = String(d.getHours()).padStart(2,"0")
  const mi = String(d.getMinutes()).padStart(2,"0")

  return `${yyyy}-${mm}-${dd}_${hh}-${mi}`
}

function buildVideoFromRange(camera, from, to, fps = 12){
  const srcDir = getCameraFolder(camera)
  const workDir = path.join("./data/tmp", `tl_${camera.id}`)
  const outDir = path.join("./data/exports")

  ensureDir(workDir)
  ensureDir(outDir)

  // tmp削除
  for(const f of fs.readdirSync(workDir)){
    fs.unlinkSync(path.join(workDir, f))
  }

  const files = fs.readdirSync(srcDir)
    .filter(f => f.endsWith(".jpg"))
    .map(f => ({
      name: f,
      full: path.join(srcDir, f),
      time: Number(f.replace(".jpg",""))
    }))
   // .filter(f => f.time >= from && f.time <= to)
    .filter(f => true)
    .sort((a,b) => a.time - b.time)

  if(files.length < 2){
    throw new Error("NOT ENOUGH IMAGES")
  }

  let index = 1
  for(const f of files){
    const dst = path.join(workDir, `${String(index).padStart(6,"0")}.jpg`)
    fs.copyFileSync(f.full, dst)
    index++
  }

  // 🔥 ここ重要（履歴ファイル）
  const filename = `camera_${camera.id}_${Date.now()}.mp4`
  const outFile = path.join(outDir, filename)

  execFileSync("ffmpeg", [
    "-y",
    "-rtsp_transport", "tcp",
    "-i", camera.rtsp_url,
    "-frames:v", "1",
    "-q:v", "2",
    filePath
  ], { stdio: "inherit" })

  return {
    file: outFile,
    url: `/exports/${filename}`
  }
}

module.exports = { buildVideoFromRange }