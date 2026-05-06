const { spawn } = require('child_process')

let gst = null


function startPipeline() {

  const screenWidth = 1920
  const screenHeight = 1080

  const cols = 4
  const rows = 3

  const tileWidth = Math.floor(screenWidth / cols)
  const tileHeight = Math.floor(screenHeight / rows)

  const args = [
    'compositor', 'name=comp', 'background=black'
  ]

  // 🔥 compositorのプロパティ（最重要）
  for (let i = 0; i < 12; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)

    args.push(
      `sink_${i}::xpos=${col * tileWidth}`,
      `sink_${i}::ypos=${row * tileHeight}`
    )
  }

  // 🔥 出力はここで1回だけ
  args.push(
    '!', 'videoconvert',
    '!', 'autovideosink'
  )

 // slot 0 → RTSP（安定版）
  args.push(
    'rtspsrc', 
    'location=rtsp://root:Cw8839629@192.168.1.194/axis-media/media.amp',
    'latency=200',
    'protocols=tcp',
    '!',
    'rtph264depay',
    '!',
    'h264parse',
    '!',
    'avdec_h264',
    '!',
    'videoconvert',
    '!',
    `video/x-raw,width=${tileWidth},height=${tileHeight}`,
    '!',
    'queue',
    '!',
    'comp.sink_0'
  )

  // slot1〜11 → 黒
  for (let i = 1; i < 12; i++) {
    args.push(
      'videotestsrc', 'pattern=black', 'is-live=true',
      '!',
      `video/x-raw,width=${tileWidth},height=${tileHeight}`,
      '!',
      'queue',
      '!',
      `comp.sink_${i}`
    )
  }

  gst = spawn('gst-launch-1.0', args, {
    stdio: 'ignore'
  })

  console.log('AutoviewPro pipeline started')
}

function stopPipeline() {
  if (gst) {
    gst.kill('SIGTERM')
    gst = null
  }
}

module.exports = {
  startPipeline,
  stopPipeline
}
