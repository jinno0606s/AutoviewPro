<template>
  <div class="page">
    <h1>Manual Event</h1>

    <div class="form">
      <label>Type</label>
      <select v-model="form.type">
        <option value="river_warning">river_warning</option>
        <option value="water_level">water_level</option>
        <option value="bear">bear</option>
        <option value="person">person</option>
        <option value="manual">manual</option>
      </select>

      <label>Level</label>
      <select v-model="form.level">
        <option value="info">info</option>
        <option value="warning">warning</option>
        <option value="danger">danger</option>
      </select>

      <label>Camera</label>
      <select v-model="form.camera_id">
        <option :value="null">-</option>
        <option v-for="cam in cameras" :key="cam.id" :value="cam.id">
          {{ cam.name }}
        </option>
      </select>

      <label>Speaker</label>
      <select v-model="form.speaker_id">
        <option :value="null">-</option>
        <option v-for="sp in speakers" :key="sp.id" :value="sp.id">
          {{ sp.name }}
        </option>
      </select>

      <label>Title</label>
      <input v-model="form.title" />

      <label>Message</label>
      <textarea v-model="form.message"></textarea>

      <div class="buttons">
        <button @click="save">EVENT作成</button>
      </div>

      <pre class="result">{{ result }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { api } from "../api/api"

const cameras = ref([])
const speakers = ref([])
const result = ref(null)

const form = ref({
  type: "river_warning",
  level: "warning",
  source: "manual",
  title: "河川注意",
  message: "カメラ映像より河川監視イベントを登録",
  camera_id: null,
  speaker_id: null,
  operator: "operator"
})

async function loadBase() {
  cameras.value = await api.getCameras()
  speakers.value = await api.getSpeakers()
}

async function save() {
  result.value = await api.createEvent(form.value)
}

onMounted(loadBase)
</script>

<style scoped>
.page {
  min-height: calc(100vh - 60px);
  background:#202020;
  color:white;
  padding: 20px;
}
.form {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 10px;
  max-width: 900px;
}
textarea {
  min-height: 120px;
}
.buttons {
  grid-column: 1 / span 2;
}
.result {
  grid-column: 1 / span 2;
  background: #111;
  color: #0f0;
  padding: 12px;
}
</style>
