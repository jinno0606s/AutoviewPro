<script setup>
import { ref, onMounted } from "vue"
import MonitoringMap from "../components/MonitoringMap.vue"

const refreshKey = ref(0)
const selectedCamera = ref(null)
const selectedSpeaker = ref(null)
const selectedEvent = ref(null)
const recentEvents = ref([])

async function loadEvents() {
  try {
    recentEvents.value = await window.autoview.getEvents({ limit: 30 })
  } catch (e) {
    console.log("loadEvents error", e)
    recentEvents.value = []
  }
}

function onSelectCamera(cam) {
  selectedCamera.value = cam
  selectedSpeaker.value = null
  selectedEvent.value = null
}

function onSelectSpeaker(sp) {
  selectedCamera.value = null
  selectedSpeaker.value = sp
  selectedEvent.value = null
}

function onSelectEvent(ev) {
  selectedCamera.value = null
  selectedSpeaker.value = null
  selectedEvent.value = ev
}

async function refreshAll() {
  refreshKey.value++
  await loadEvents()
}

onMounted(async () => {
  await refreshAll()
})
</script>

<template>
  <div class="monitoring-center">
    <div class="topbar">
      <h2>AutoViewPro Monitoring Center</h2>
      <button @click="refreshAll">Refresh</button>
    </div>

    <div class="layout">
      <div class="left-panel">
        <div class="panel">
          <h3>Recent Events</h3>

          <div v-if="recentEvents.length === 0" class="empty">
            No events
          </div>

          <div
            v-for="ev in recentEvents"
            :key="ev.id"
            class="event-row"
            @click="onSelectEvent(ev)"
          >
            <div class="event-title">
              [{{ ev.type || "event" }}] {{ ev.title || "-" }}
            </div>
            <div class="event-meta">
              {{ ev.created_at || "-" }}
            </div>
            <div class="event-msg">
              {{ ev.message || "-" }}
            </div>
          </div>
        </div>

        <div class="panel detail-panel">
          <h3>Detail</h3>

          <div v-if="selectedCamera">
            <div><b>Camera</b></div>
            <div>ID: {{ selectedCamera.id }}</div>
            <div>Name: {{ selectedCamera.name }}</div>
            <div>Address: {{ selectedCamera.address }}</div>
            <div>Lat: {{ selectedCamera.lat }}</div>
            <div>Lng: {{ selectedCamera.lng }}</div>
          </div>

          <div v-else-if="selectedSpeaker">
            <div><b>Speaker</b></div>
            <div>ID: {{ selectedSpeaker.id }}</div>
            <div>Name: {{ selectedSpeaker.name }}</div>
            <div>Address: {{ selectedSpeaker.address }}</div>
            <div>Lat: {{ selectedSpeaker.lat }}</div>
            <div>Lng: {{ selectedSpeaker.lng }}</div>
          </div>

          <div v-else-if="selectedEvent">
            <div><b>Event</b></div>
            <div>ID: {{ selectedEvent.id }}</div>
            <div>Type: {{ selectedEvent.type }}</div>
            <div>Title: {{ selectedEvent.title }}</div>
            <div>Message: {{ selectedEvent.message }}</div>
            <div>Status: {{ selectedEvent.status }}</div>
            <div>Lat: {{ selectedEvent.lat }}</div>
            <div>Lng: {{ selectedEvent.lng }}</div>
          </div>

          <div v-else class="empty">
            Select a camera, speaker, or event
          </div>
        </div>
      </div>

      <div class="map-panel">
        <MonitoringMap
          :refresh-key="refreshKey"
          @selectCamera="onSelectCamera"
          @selectSpeaker="onSelectSpeaker"
          @selectEvent="onSelectEvent"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.monitoring-center {
  background:#202020;
  padding: 16px;
  height: 100%;
  box-sizing: border-box;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 14px;
  height: calc(100vh - 120px);
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}

.panel {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px;
  overflow: auto;
}

.detail-panel {
  flex: 1;
}

.map-panel {
  min-height: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 8px;
}

.event-row {
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 8px;
  cursor: pointer;
}

.event-row:hover {
  background: #f7f7f7;
}

.event-title {
  font-weight: bold;
}

.event-meta {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.event-msg {
  margin-top: 4px;
  font-size: 13px;
}

.empty {
  color: #777;
  padding: 10px 0;
}
</style>