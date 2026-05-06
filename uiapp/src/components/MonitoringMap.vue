<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const props = defineProps({
  refreshKey: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(["selectCamera", "selectSpeaker", "selectEvent"])

const mapEl = ref(null)
let map = null

let cameraMarkers = []
let speakerMarkers = []
let eventMarkers = []

const cameras = ref([])
const speakers = ref([])
const events = ref([])

const defaultCenter = [
  Number(import.meta.env.VITE_MAP_CENTER_LNG || 139.6455),
  Number(import.meta.env.VITE_MAP_CENTER_LAT || 35.8617)
]

const defaultZoom = Number(import.meta.env.VITE_MAP_ZOOM || 13)

async function loadMapData() {
  try {
    const [camRows, spRows, evRows] = await Promise.all([
      window.autoview.getMapCameras(),
      window.autoview.getMapSpeakers(),
      window.autoview.getEvents({ limit: 200 })
    ])

    cameras.value = Array.isArray(camRows) ? camRows : []
    speakers.value = Array.isArray(spRows) ? spRows : []
    events.value = Array.isArray(evRows)
      ? evRows.filter(v => v.lat != null && v.lng != null)
      : []

    redrawMarkers()
    fitAll()
  } catch (e) {
    console.log("loadMapData error", e)
  }
}

function clearMarkers(list) {
  list.forEach(m => m.remove())
  list.length = 0
}

function popupHtml(title, body) {
  return `
    <div style="min-width:220px">
      <div style="font-weight:bold;margin-bottom:6px">${title}</div>
      <div>${body}</div>
    </div>
  `
}

function addCameraMarkers() {
  clearMarkers(cameraMarkers)

  cameras.value.forEach(cam => {
    const markerEl = document.createElement("div")
    markerEl.className = "map-marker camera-marker"
    markerEl.innerHTML = "📷"

    const popup = new mapboxgl.Popup({ offset: 20 }).setHTML(
      popupHtml(
        `Camera #${cam.id} ${cam.name || ""}`,
        `
        <div>住所: ${cam.address || "-"}</div>
        <div>Lat: ${cam.lat}</div>
        <div>Lng: ${cam.lng}</div>
        `
      )
    )

    const marker = new mapboxgl.Marker(markerEl)
      .setLngLat([Number(cam.lng), Number(cam.lat)])
      .setPopup(popup)
      .addTo(map)

    markerEl.addEventListener("click", () => {
      emit("selectCamera", cam)
    })

    cameraMarkers.push(marker)
  })
}

function addSpeakerMarkers() {
  clearMarkers(speakerMarkers)

  speakers.value.forEach(sp => {
    const markerEl = document.createElement("div")
    markerEl.className = "map-marker speaker-marker"
    markerEl.innerHTML = "🔊"

    const popup = new mapboxgl.Popup({ offset: 20 }).setHTML(
      popupHtml(
        `Speaker #${sp.id} ${sp.name || ""}`,
        `
        <div>住所: ${sp.address || "-"}</div>
        <div>Lat: ${sp.lat}</div>
        <div>Lng: ${sp.lng}</div>
        `
      )
    )

    const marker = new mapboxgl.Marker(markerEl)
      .setLngLat([Number(sp.lng), Number(sp.lat)])
      .setPopup(popup)
      .addTo(map)

    markerEl.addEventListener("click", () => {
      emit("selectSpeaker", sp)
    })

    speakerMarkers.push(marker)
  })
}

function eventIcon(ev) {
  if (ev.type === "bear") return "🐻"
  if (ev.type === "flood") return "🌊"
  if (ev.type === "warning") return "⚠️"
  return "■"
}

function addEventMarkers() {
  clearMarkers(eventMarkers)

  events.value.forEach(ev => {
    const markerEl = document.createElement("div")
    markerEl.className = "map-marker event-marker"
    markerEl.innerHTML = eventIcon(ev)

    const popup = new mapboxgl.Popup({ offset: 20 }).setHTML(
      popupHtml(
        `[${ev.type || "event"}] ${ev.title || ""}`,
        `
        <div>内容: ${ev.message || "-"}</div>
        <div>状態: ${ev.status || "-"}</div>
        <div>発生: ${ev.created_at || "-"}</div>
        <div>Lat: ${ev.lat}</div>
        <div>Lng: ${ev.lng}</div>
        `
      )
    )

    const marker = new mapboxgl.Marker(markerEl)
      .setLngLat([Number(ev.lng), Number(ev.lat)])
      .setPopup(popup)
      .addTo(map)

    markerEl.addEventListener("click", () => {
      emit("selectEvent", ev)
    })

    eventMarkers.push(marker)
  })
}

function redrawMarkers() {
  if (!map) return
  addCameraMarkers()
  addSpeakerMarkers()
  addEventMarkers()
}

function fitAll() {
  if (!map) return

  const all = [
    ...cameras.value.map(v => [Number(v.lng), Number(v.lat)]),
    ...speakers.value.map(v => [Number(v.lng), Number(v.lat)]),
    ...events.value.map(v => [Number(v.lng), Number(v.lat)])
  ]

  if (all.length === 0) {
    map.setCenter(defaultCenter)
    map.setZoom(defaultZoom)
    return
  }

  if (all.length === 1) {
    map.setCenter(all[0])
    map.setZoom(15)
    return
  }

  const bounds = new mapboxgl.LngLatBounds()
  all.forEach(p => bounds.extend(p))

  map.fitBounds(bounds, {
    padding: 60,
    maxZoom: 16,
    duration: 500
  })
}

async function initMap() {
  await nextTick()

  if (!mapEl.value) return

  if (map) {
    map.remove()
    map = null
  }

  map = new mapboxgl.Map({
    container: mapEl.value,
    style: import.meta.env.VITE_MAP_STYLE || "mapbox://styles/mapbox/streets-v12",
    center: defaultCenter,
    zoom: defaultZoom
  })

  map.addControl(new mapboxgl.NavigationControl(), "top-right")

  map.on("load", async () => {
    await loadMapData()
    setTimeout(() => {
      map.resize()
    }, 200)
  })
}

watch(
  () => props.refreshKey,
  async () => {
    await loadMapData()
  }
)

onMounted(async () => {
  await initMap()
})

onBeforeUnmount(() => {
  clearMarkers(cameraMarkers)
  clearMarkers(speakerMarkers)
  clearMarkers(eventMarkers)

  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div class="monitoring-map-wrap">
    <div ref="mapEl" class="monitoring-map"></div>

    <div class="map-legend">
      <span>📷 Camera</span>
      <span>🔊 Speaker</span>
      <span>■ Event</span>
      <span>🐻 Bear</span>
      <span>🌊 Flood</span>
    </div>
  </div>
</template>

<style scoped>
.monitoring-map-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 450px;
}

.monitoring-map {
  width: 100%;
  height: 100%;
  min-height: 450px;
  border-radius: 8px;
  overflow: hidden;
}

.map-legend {
  position: absolute;
  left: 10px;
  bottom: 10px;
  background: rgba(255,255,255,0.92);
  padding: 8px 10px;
  border-radius: 6px;
  display: flex;
  gap: 12px;
  font-size: 13px;
  z-index: 2;
}

:deep(.map-marker) {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  cursor: pointer;
  border: 2px solid #333;
}

:deep(.camera-marker) {
  border-color: #0d6efd;
}

:deep(.speaker-marker) {
  border-color: #198754;
}

:deep(.event-marker) {
  border-color: #dc3545;
}
</style>