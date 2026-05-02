<template>
  <div class="event-panel">
    <div class="event-panel-header">
      <h2>EVENT</h2>
      <button @click="reload">再読込</button>
    </div>

    <div class="event-list">
      <div
        v-for="ev in events"
        :key="ev.id"
        class="event-card"
        :class="ev.level"
      >
        <div class="row">
          <strong>#{{ ev.id }} {{ ev.title }}</strong>
          <span>{{ ev.created_at }}</span>
        </div>

        <div class="row">
          <span>type: {{ ev.type }}</span>
          <span>level: {{ ev.level }}</span>
          <span>status: {{ ev.status }}</span>
        </div>

        <div class="row">
          <span>camera: {{ ev.camera_name || ev.camera_id || "-" }}</span>
          <span>speaker: {{ ev.speaker_name || ev.speaker_id || "-" }}</span>
        </div>

        <div class="message">{{ ev.message }}</div>

        <div class="row">
          <span>{{ ev.lat }}, {{ ev.lng }}</span>
          <button
            v-if="ev.status !== 'closed'"
            @click="closeEvent(ev.id)"
          >
            CLOSE
          </button>
        </div>
      </div>

      <div v-if="events.length === 0" class="empty">
        eventなし
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import api from "../api/api.js"

const events = ref([])

async function reload(){

 if(!window.autoview) return

 const data =
 await window.autoview.getEvents({limit:100})

 events.value = data || []

}


async function closeEvent(id) {
  await api.closeEvent({
    id,
    operator: "dashboard"
  })
  await reload()
}

onMounted(()=>{

 reload()

 setInterval(()=>{

  if(window.autoview)
   reload()

 },5000)

})

</script>

<style scoped>
.event-panel {
  height: 100%;
  background: #111;
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: 12px;
  box-sizing: border-box;
}
.event-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.event-list {
  overflow: auto;
  margin-top: 12px;
}
.event-card {
  border: 1px solid #444;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 8px;
  background: #1b1b1b;
}
.event-card.info { border-left: 6px solid #4da3ff; }
.event-card.warning { border-left: 6px solid #ffb84d; }
.event-card.danger { border-left: 6px solid #ff4d4d; }

.row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.message {
  margin: 8px 0;
  color: #ddd;
}
.empty {
  opacity: 0.7;
  padding: 20px 0;
}
</style>