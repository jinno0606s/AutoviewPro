// api.js
function isElectron(){
  return !!window.autoview
}

export const api = {

  // 追加
  post: async (url, data) => {

    if(isElectron()){
      // Electronは直接呼ばない（今回は使わない）
      console.log("⚠ post called in Electron, fallback API")
    }

    return await fetch(url,{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body: JSON.stringify(data)
    }).then(r=>r.json())

  },

  // Cameras
  getCameras: async () => {
    if(isElectron()){
      return await window.autoview.getCameras()
    }else{
      return await fetch("/api/cameras").then(r=>r.json())
    }
  },

   //人数カウント
  getPeople: async () => {

    if (window.autoview) {
      return await window.autoview.getPeople()
    }

    const res = await fetch("/api/people")
    return await res.json()
  },

  // Speakers
  getSpeakers: async () => {
    if(isElectron()){
      return await window.autoview.getSpeakers()
    }else{
      return await fetch("/api/speakers").then(r=>r.json())
    }
  },

  speakerTest: async (sp) => {

    const payload = {
      ip: sp.ip || sp.ip_address || sp.host,
      file_path: sp.file_path || "logo.mp3"
    }

    console.log("🔥 FINAL PAYLOAD =", payload)

    if(window.autoview){
      return await window.autoview.speakerTest(payload)
    }else{
      return await fetch("/api/speaker/test",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(payload)
      })
    }

  },

  // Layout
  startLayout: async (n) => {
    if(isElectron()){
      return await window.autoview.startLayout({count:n})
    }else{
      return await fetch(`/api/layout/${n}`)
    }
  },

  startLiveTest: async (cam) => {

    if(window.autoview){

      return await window.autoview.startLiveTest(cam)

    }else{

      return await fetch(`/api/camera/${cam.id}`)

    }

  },
  

  stop: async () => {
    if(isElectron()){
      return await window.autoview.stopStream()
    }else{
      return await fetch("/api/stop")
    }
  },

  // GEO
  geocodeAddress: async (address) => {
    if(isElectron()){
      return await window.autoview.geocodeAddress(address)
    }else{
      return await fetch(`/api/geocode?address=${encodeURIComponent(address)}`).then(r=>r.json())
    }
  }

}