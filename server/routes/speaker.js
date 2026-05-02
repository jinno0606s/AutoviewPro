// speaker.js
const http = require("http")

function playAxisSpeaker(ip) {

  const url = `http://${ip}/axis-cgi/mediaclip.cgi?action=play&clip=bell.wav`

  http.get(url, res => {
    console.log("PLAY:", ip)
  }).on("error", e => {
    console.error(e)
  })
}

module.exports = { playAxisSpeaker }
