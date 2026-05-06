function getApiUrl(){

 if(window.autoview?.apiUrl){

   return window.autoview.apiUrl

 }

 return window.location.origin

}

function hasElectronApi() {
  return typeof window !== "undefined" && !!window.autoview
}

function baseUrl() {
  if (hasElectronApi() && window.autoview.apiUrl) {
    return window.autoview.apiUrl
  }
  return window.location.origin
}

async function getJson(path, options = {}) {
  const res = await fetch(baseUrl() + path, options)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${path}`)
  }
  return await res.json()
}

async function getText(path, options = {}) {
  const res = await fetch(baseUrl() + path, options)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${path}`)
  }
  return await res.text()
}

export const api = {
  apiUrl: () => baseUrl(),

  // Cameras
  getCameras: async () => {
    if (hasElectronApi()) return await window.autoview.getCameras()
    return await getJson("/api/cameras")
  },

  saveCamera: async (data) => {
    if (hasElectronApi()) return await window.autoview.saveCamera(data)
    throw new Error("saveCamera is Electron only for now")
  },

  updateCamera: async (data) => {
    if (hasElectronApi()) return await window.autoview.updateCamera(data)
    throw new Error("updateCamera is Electron only for now")
  },

  setCameraEnabled: async (data) => {
    if (hasElectronApi()) return await window.autoview.setCameraEnabled(data)
    throw new Error("setCameraEnabled is Electron only for now")
  },

  showCamera: async (id) => {
    if (hasElectronApi() && window.autoview.showCamera) {
      return await window.autoview.showCamera(id)
    }
    return await getText(`/api/camera/${id}`)
  },

  // Speakers
  getSpeakers: async () => {
    if (hasElectronApi()) return await window.autoview.getSpeakers()
    return await getJson("/api/speakers")
  },

  saveSpeaker: async (data) => {
    if (hasElectronApi()) return await window.autoview.saveSpeaker(data)
    throw new Error("saveSpeaker is Electron only for now")
  },

  updateSpeaker: async (data) => {
    if (hasElectronApi()) return await window.autoview.updateSpeaker(data)
    throw new Error("updateSpeaker is Electron only for now")
  },

  speakerTest: async (data) => {
    if (hasElectronApi()) return await window.autoview.speakerTest(data)
    if (data?.id != null) {
      return await getText(`/api/speaker/${data.id}`)
    }
    throw new Error("speakerTest in browser requires speaker id")
  },

  // Layout
  startLayout: async (data) => {
    if (hasElectronApi()) return await window.autoview.startLayout(data)
    const count = Number(data?.count || 1)
    return await getText(`/api/layout/${count}`)
  },

  stopSequence: async () => {
    if (hasElectronApi()) return await window.autoview.stopSequence()
    throw new Error("stopSequence is Electron only for now")
  },

  stopStream: async () => {
    if (hasElectronApi()) return await window.autoview.stopStream()
    return await getText("/api/stop")
  },

  getLayout: async (count) => {
    if (hasElectronApi()) return await window.autoview.getLayout(count)
    throw new Error("getLayout is Electron only for now")
  },

  saveLayout: async (data) => {
    if (hasElectronApi()) return await window.autoview.saveLayout(data)
    throw new Error("saveLayout is Electron only for now")
  },

  // Live test
  startStream: async (url) => {
    if (hasElectronApi()) return await window.autoview.startStream(url)
    throw new Error("startStream is Electron only for now")
  },

  startLiveTest: async (data) => {
    if (hasElectronApi()) return await window.autoview.startLiveTest(data)
    throw new Error("startLiveTest is Electron only for now")
  },

  stopLiveTest: async () => {
    if (hasElectronApi()) return await window.autoview.stopLiveTest()
    throw new Error("stopLiveTest is Electron only for now")
  },

  // GEO / MAP
  geocodeAddress: async (address) => {
    if (hasElectronApi()) return await window.autoview.geocodeAddress(address)
    return await getJson(`/api/geocode?address=${encodeURIComponent(address)}`)
  },

  getMapCameras: async () => {
    if (hasElectronApi()) return await window.autoview.getMapCameras()
    return await getJson("/api/map/cameras")
  },

  getMapSpeakers: async () => {
    if (hasElectronApi()) return await window.autoview.getMapSpeakers()
    return await getJson("/api/map/speakers")
  },

  setTempLocation: async (data) => {
    if (hasElectronApi()) return await window.autoview.setTempLocation(data)
    throw new Error("setTempLocation is Electron only for now")
  },

  getTempLocation: async () => {
    if (hasElectronApi()) return await window.autoview.getTempLocation()
    return null
  },

  clearTempLocation: async () => {
    if (hasElectronApi()) return await window.autoview.clearTempLocation()
    return { ok: true }
  },

  // Events
  getEvents: async (payload = {}) => {
    if (hasElectronApi()) return await window.autoview.getEvents(payload)
    return await getJson("/api/events")
  },

  getOpenEvents: async () => {
    if (hasElectronApi()) return await window.autoview.getOpenEvents()
    throw new Error("getOpenEvents is Electron only for now")
  },

  createEvent: async (payload) => {
    if (hasElectronApi()) return await window.autoview.createEvent(payload)
    throw new Error("createEvent is Electron only for now")
  },

  closeEvent: async (payload) => {
    if (hasElectronApi()) return await window.autoview.closeEvent(payload)
    throw new Error("closeEvent is Electron only for now")
  },

  // Rules
  getRules: async () => {
    if (hasElectronApi()) return await window.autoview.getRules()
    throw new Error("getRules is Electron only for now")
  },

  saveRule: async (payload) => {
    if (hasElectronApi()) return await window.autoview.saveRule(payload)
    throw new Error("saveRule is Electron only for now")
  },

  updateRule: async (payload) => {
    if (hasElectronApi()) return await window.autoview.updateRule(payload)
    throw new Error("updateRule is Electron only for now")
  },

  // Clips
  getClips: async () => {
    if (hasElectronApi()) return await window.autoview.getClips()
    throw new Error("getClips is Electron only for now")
  },

  saveClip: async (payload) => {
    if (hasElectronApi()) return await window.autoview.saveClip(payload)
    throw new Error("saveClip is Electron only for now")
  },

  updateClip: async (payload) => {
    if (hasElectronApi()) return await window.autoview.updateClip(payload)
    throw new Error("updateClip is Electron only for now")
  }
}