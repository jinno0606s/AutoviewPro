<template>
  <div class="page">

    <h2>システム管理</h2>

    <!-- 状態 -->
    <div class="card">
      <h3>状態</h3>
      <p>DB: {{ status.dbPath }}</p>
      <p>カメラ数: {{ status.cameras }}</p>
      <p>スピーカー数: {{ status.speakers }}</p>
    </div>

    <!-- バックアップ -->
    <div class="card">
      <h3>バックアップ</h3>
      <button @click="backup">バックアップ作成</button>
    </div>

    <!-- 初期化 -->
    <div class="card danger">
      <h3>初期化</h3>

      <button @click="initCameraSpeaker">
        カメラ・スピーカー初期化
      </button>

      <button @click="initAll" class="danger">
        ⚠ 完全初期化
      </button>
    </div>

    <!-- 復元 -->
    <div class="card">
      <h3>復元</h3>

      <select v-model="selected">
        <option v-for="b in backups" :key="b">
          {{ b }}
        </option>
      </select>

      <button @click="restore">復元</button>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"

const status = ref({})
const backups = ref([])
const selected = ref("")

async function loadStatus(){
  status.value = await fetch("/api/system/status").then(r=>r.json())
}

async function loadBackups(){
  backups.value = await fetch("/api/system/backups").then(r=>r.json())
}

async function backup(){
  await fetch("/api/system/backup", { method:"POST" })
  alert("バックアップ完了")
  loadBackups()
}

async function initCameraSpeaker(){
  if(!confirm("カメラ・スピーカーを初期化します")) return

  await fetch("/api/system/init", { method:"POST" })
  alert("初期化完了")
  location.reload()
}

async function initAll(){
  if(!confirm("⚠ 完全初期化します")) return

  await fetch("/api/system/init-all", { method:"POST" })
  alert("完全初期化完了")
  location.reload()
}

async function restore(){
  if(!selected.value) return

  await fetch("/api/system/restore", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ file:selected.value })
  })

  alert("復元完了")
  location.reload()
}

onMounted(()=>{
  loadStatus()
  loadBackups()
})
</script>

<style scoped>
.page { padding:20px }
.card {
  background:#fff;
  padding:15px;
  margin-bottom:10px;
  border-radius:8px;
}
.danger { background:#ffeaea }
button { margin-right:10px }
</style>