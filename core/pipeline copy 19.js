const { spawn } = require("child_process")

let gst = null

// =====================
// GRID
// =====================

const GRID = {
  1:{cols:1,rows:1},
  4:{cols:2,rows:2},
  9:{cols:3,rows:3},
  12:{cols:4,rows:3}
}

function getGrid(count){
  return GRID[count] || GRID[1]
}

// =====================
// KILL
// =====================

function killProc(p){
  if(!p) return
  try{ p.kill("SIGTERM") }catch(e){}
  setTimeout(()=>{ try{ p.kill("SIGKILL") }catch(e){} },1000)
}

// =====================
// BUILD
// =====================

function buildCmd(items,count){

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

   // cmd.push(`sink_${i}::width=${tileW}`)
   // cmd.push(`sink_${i}::height=${tileH}`)


  }

  for(let i=0;i<count;i++){

    const cam=items[i]

    if(cam && cam.url){

      const label=(cam.name||`CAM${i+1}`).replace(/'/g,"")

     cmd.push(
        "rtspsrc",
        `location=${cam.url}`,
        "latency=200",
        "protocols=tcp",
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
        `video/x-raw,width=${tileW},height=${tileH}`,
        "!",
        "textoverlay",
        `text=${label}`,
        "valignment=top",
        "halignment=left",
        "font-desc=Sans,18",
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
        `video/x-raw,width=${tileW},height=${tileH}`,
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
    "queue",
    "!",
    "ximagesink",
    "sync=false"
  )

  return cmd
}

// =====================
// SPAWN
// =====================

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

// =====================
// START
// =====================
function startPipeline(items,count){

  if(gst) return

  gst = spawnPipeline(items,count)

}
// =====================
// SWITCH
// =====================

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

// =====================
// STOP
// =====================

function stopPipeline(){

  if(gst){
    killProc(gst)
    gst=null
  }

}

module.exports={
  startPipeline,
  switchPipeline,
  stopPipeline
}