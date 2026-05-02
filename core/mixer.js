const { spawn } = require("child_process")
const fs = require("fs")

let mixer = null

function startMixer(count, ids) {

  if (mixer) {
    try { mixer.kill("SIGTERM") } catch {}
    mixer = null
  }

  console.log("MIXER START")

  const screenW = 1920
  const screenH = 1080

  const cols =
    count == 1 ? 1 :
    count == 4 ? 2 :
    count == 9 ? 3 :
    4

  const rows =
    count == 1 ? 1 :
    count == 4 ? 2 :
    count == 9 ? 3 :
    3

  const tileW = Math.floor(screenW / cols)
  const tileH = Math.floor(screenH / rows)

  const args = [
    "compositor",
    "name=comp",
    "background=black"
  ]

  for (let i = 0; i < count; i++) {

    const col = i % cols
    const row = Math.floor(i / cols)

    args.push(
      `sink_${i}::xpos=${col * tileW}`,
      `sink_${i}::ypos=${row * tileH}`
    )

  }

  for (let i = 0; i < count; i++) {

    const id = ids[i]
    const sock = `/tmp/cam${id}`

    args.push(
      "shmsrc",
      `socket-path=${sock}`,
      "is-live=true",
      "do-timestamp=true",
      "!",
      "videoconvert",
      "!",
      "videoscale",
      "!",
      `video/x-raw,width=${tileW},height=${tileH}`,
      "!",
      `comp.sink_${i}`
    )


    args.push(
      "shmsrc", `socket-path=${sock}`, "is-live=true", "do-timestamp=true",
      "!",
      "queue",
      "max-size-buffers=2",
      "leaky=downstream",
      "!",
      "capsfilter",
      "caps=video/x-raw,format=I420,width=640,height=360,framerate=30/1",
      "!",
      "videoconvert",
      "!",
      "videoscale",
      "!",
      "capsfilter",
      `caps=video/x-raw,format=I420,width=${tileW},height=${tileH},framerate=30/1`,
      "!",
      `comp.sink_${i}`
    )

  }

  args.push(
    "comp.",
    "!",
    "videoconvert",
    "!",
    "glimagesink",
    "sync=false"
  )

  console.log("GST MIXER:", args.join(" "))

  mixer = spawn("gst-launch-1.0", args, {
    stdio: ["ignore", "pipe", "pipe"]
  })

  mixer.stdout.on("data", d => console.log("MIXER:", d.toString()))
  mixer.stderr.on("data", d => console.log("MIXER ERR:", d.toString()))

}

module.exports = { startMixer }