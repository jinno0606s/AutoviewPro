const { spawn } = require("child_process")

let gstCurrent = null
let switchToken = 0
let gst = null

const GRID_MAP = {
  1:  { cols: 1, rows: 1 },
  4:  { cols: 2, rows: 2 },
  9:  { cols: 3, rows: 3 },
  12: { cols: 4, rows: 3 }
}

function getGrid(count){
  return GRID_MAP[count] || GRID_MAP[1]
}

function killProc(proc, signal = "SIGTERM"){
  if(!proc) return
  try{ proc.kill(signal) }catch(e){}
}

function stopPipeline(){
  if(gstCurrent){
    const p = gstCurrent
    gstCurrent = null
    killProc(p, "SIGTERM")
    setTimeout(()=>killProc(p, "SIGKILL"), 1000)
  }
  return Promise.resolve()
}

function buildCmd(items, count){
  const W = 1920
  const H = 1080

  const { cols, rows } = getGrid(count)
  const tileW = Math.floor(W / cols)
  const tileH = Math.floor(H / rows)

  const cmd = [
    "compositor",
    "name=comp",
    "background=black"
  ]

  for(let i=0;i<count;i++){
    const x = (i % cols) * tileW
    const y = Math.floor(i / cols) * tileH
    cmd.push(`sink_${i}::xpos=${x}`)
    cmd.push(`sink_${i}::ypos=${y}`)
  }

  for(let i=0;i<count;i++){
    const item = items[i]

    if(item && item.url){
      const label = String(item.name || `CAM${i+1}`).replace(/'/g, "")

      cmd.push(
        "rtspsrc",
        `location=${item.url}`,
        "latency=200",
        "protocols=tcp",
        "retry=5",
        "timeout=5000000",
        "tcp-timeout=5000000",
        "!",
        "rtph264depay",
        "!",
        "decodebin",
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
        "font-desc=Sans,18",
        "shaded-background=true",
        "draw-shadow=false",
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
    "ximagesink",
    "sync=false"
  )

  return cmd
}

function spawnPipeline(items, count){
  const cmd = buildCmd(items, count)

  console.log("START:", "gst-launch-1.0", cmd.join(" "))

  const proc = spawn("gst-launch-1.0", cmd, {
    env: {
      ...process.env,
      DISPLAY: ":0",
      XAUTHORITY: process.env.XAUTHORITY || "/home/comworks/.Xauthority"
    }
  })

  proc.stderr.on("data", (d) => {
    console.log(d.toString())
  })

  proc.on("exit", (c, s) => {
    console.log("gst exited:", c, s)
    if(gstCurrent && gstCurrent.pid === proc.pid){
      gstCurrent = null
    }
  })

  return proc
}
/*
async function startPipeline(items, count){
  await stopPipeline()
  gstCurrent = spawnPipeline(items, count)
  return gstCurrent
}
*/

async function switchPipeline(items, count){
  const token = ++switchToken

  if(!gstCurrent){
    gstCurrent = spawnPipeline(items, count)
    return gstCurrent
  }

  const oldProc = gstCurrent
  const newProc = spawnPipeline(items, count)
  gstCurrent = newProc

  setTimeout(() => {
    if(token !== switchToken) return
    killProc(oldProc, "SIGTERM")
    setTimeout(() => killProc(oldProc, "SIGKILL"), 1000)
  }, 1200)

  return newProc
}

/*
function switchPipeline(items,count){

  // pipeline がある場合は何もしない
  if(gst){
    return
  }

  return startPipeline(items,count)

}
*/
function startPipeline(items,count){

  if(gst){
    return
  }

  const cmd = buildCmd(items,count)

  console.log("START:", "gst-launch-1.0", cmd.join(" "))

  gst = spawn("gst-launch-1.0", cmd, {
    env:{
      ...process.env,
      DISPLAY:":0",
      XAUTHORITY: process.env.XAUTHORITY || "/home/comworks/.Xauthority"
    }
  })

  gst.stderr.on("data",(d)=>{
    console.log(d.toString())
  })

  gst.on("exit",(c,s)=>{
    console.log("gst exited:",c,s)
    gst = null
  })

}


module.exports = {
  startPipeline,
  switchPipeline,
  stopPipeline
}