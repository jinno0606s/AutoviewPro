const { spawn } = require("child_process")
const net = require("net")


let gst = null

const GRID = {
  1:{cols:1,rows:1},
  4:{cols:2,rows:2},
  9:{cols:3,rows:3},
  12:{cols:4,rows:3}
}

// =======================
// CAMERA STATE
// =======================
const cameraState = {}

function checkRtspHost(ip, port = 554, timeout = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket()

    socket.setTimeout(timeout)

    socket.on("connect", () => {
      socket.destroy()
      resolve(true)
    })

    socket.on("error", () => resolve(false))
    socket.on("timeout", () => {
      socket.destroy()
      resolve(false)
    })

    socket.connect(port, ip)
  })
}

// =======================
// CAMERA CHECK LOOP
// =======================
async function startCamera(cam) {
  const camId = cam.id

  if (!cameraState[camId]) {
    cameraState[camId] = { online: false }
  }

  const url = new URL(cam.rtsp_url)
  const ip = url.hostname

  const ok = await checkRtspHost(ip)

  if (!ok) {
    if (cameraState[camId].online !== false) {
      console.log(`🔴 CAMERA OFFLINE: ${camId} (${ip})`)
    }
    cameraState[camId].online = false
    return false
  }

  if (!cameraState[camId].online) {
    console.log(`🟢 CAMERA ONLINE: ${camId} (${ip})`)
  }

  cameraState[camId].online = true
  return true
}

function startCameraMonitor(cameras) {
  setInterval(async () => {
    for (const cam of cameras) {
      if (!cam.enabled) continue
      await startCamera(cam)
    }
  }, 5000)
}

// This function periodically checks the status of each camera in the provided list and starts the stream for any cameras that are online but not currently running. It runs every 5 seconds to ensure that any changes in camera status are detected and handled promptly.
/*
function startPipeline(items, count) {

  // カメラ監視開始（1回だけ）
  startCameraMonitor(items)

  if (gst) return

  gst = spawnPipeline(items, count)
}
*/
function getGrid(count){
  return GRID[count] || GRID[1]
}

function killProc(p){
  if(!p) return
  try{ p.kill("SIGTERM") }catch(e){}
  setTimeout(()=>{ try{ p.kill("SIGKILL") }catch(e){} },1000)
}

function buildCmd(items){
  const count = items.length
  const W=1920
  const H=1080

  const {cols,rows}=getGrid(count)

  const tileW=Math.floor(W/cols)
  const tileH=Math.floor(H/rows)

  const cmd=[
    "compositor",
    "name=comp",
    "background=black"
  ]

  for(let i=0;i<count;i++){

    const x=(i%cols)*tileW
    const y=Math.floor(i/cols)*tileH

    cmd.push(`sink_${i}::xpos=${x}`)
    cmd.push(`sink_${i}::ypos=${y}`)
    cmd.push(`sink_${i}::width=${tileW}`)
    cmd.push(`sink_${i}::height=${tileH}`)
  }

  for(let i=0;i<items.length;i++){

    const cam=items[i]

    if(cam && cam.rtsp_url){

      const label=(cam.name||`CAM${i+1}`).replace(/'/g,"")

      cmd.push(
        "rtspsrc",
        `location=${cam.rtsp_url}`,
        "latency=200",
        "protocols=tcp",
        "retry=5",
        "timeout=5000000",
        "tcp-timeout=5000000",
        "do-rtsp-keep-alive=true",
        "!",
        "rtph264depay",
        "!",
        "h264parse",
        "!",
        "avdec_h264",
        "!",
        "queue",
        "leaky=downstream",
        "max-size-buffers=30",
        "!",
        "videoconvert",
        "!",
        "videoscale",
        "!",
        `video/x-raw,width=${tileW},height=${tileH},pixel-aspect-ratio=1/1`,
        "!",
        "textoverlay",
        `text=${label}`,
        "valignment=top",
        "halignment=left",
        "font-desc=Sans 18",
        "shaded-background=true",
        "!",
        `comp.sink_${i}`
      )

    }else{

      cmd.push(
        "videotestsrc",
        "pattern=black",
        "is-live=true",
        "!",
        `video/x-raw,width=${tileW},height=${tileH},pixel-aspect-ratio=1/1`,
        "!",
        `comp.sink_${i}`
      )
    }
  }

  cmd.push(
    "comp.",
    "!",
    "videoconvert",
    "!",
    "videoscale",
    "!",
    `video/x-raw,width=${W},height=${H},pixel-aspect-ratio=1/1`,
    "!",
    "queue",
    "!",
    "ximagesink",
    "sync=false"
  )

  return cmd
}

function spawnPipeline(items,count){

  const cmd=buildCmd(items,count)

  console.log("START:", "gst-launch-1.0", cmd.join(" "))

  const proc=spawn("gst-launch-1.0",cmd,{
    env:{
      ...process.env,
      DISPLAY:":0",
      XAUTHORITY:process.env.XAUTHORITY || "/home/comworks/.Xauthority"
    }
  })

  proc.stderr.on("data",(d)=>{
    console.log(d.toString())
  })

  proc.on("exit",(c,s)=>{
    console.log("gst exited:",c,s)
    if(gst && gst.pid===proc.pid){
      gst=null
    }
  })

  return proc
}

function startPipeline(items, count){

  const activeCams = items.filter(cam => {
    return (
      Number(cam.enabled) === 1 &&
     // Number(cam.people_count_enabled) === 1 &&
      cam.rtsp_url
    )
  })

  console.log("🎯 ACTIVE CAMS:", activeCams)
  console.log("📦 INPUT ITEMS:", items)
  
  setInterval(() => {
    for (const cam of activeCams) {
      startCamera(cam)
    }
  }, 5000)

  if (gst) return

  // 👇 ここが重要
  gst = spawnPipeline(activeCams, count)
}

function switchPipeline(items,count){

  const old=gst

  const next=spawnPipeline(items,count)

  gst=next

  if(old){
    setTimeout(()=>{
      killProc(old)
    },1200)
  }
}

function stopPipeline(){

  if(gst){
    killProc(gst)
    gst=null
  }
}

function gstIsRunning(){
  return !!gst
}

module.exports={
  startPipeline,
  switchPipeline,
  stopPipeline,
  gstIsRunning
}