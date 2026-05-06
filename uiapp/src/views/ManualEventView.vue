<template>
  <div>
    <h2>イベントプラグイン</h2>

<div class="grid">
  <div
    v-for="p in plugins"
    :key="p.name"
    class="card"
    @click="runPlugin(p)"
  >
    <div class="icon">{{ p.icon }}</div>
    <div>{{ p.label }}</div>
  </div>
</div>

<component :is="currentView" v-if="currentView" />


  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"

const plugins = ref([])
const currentView = ref(null)

onMounted(async ()=>{
  const res = await fetch("/api/plugins")
  plugins.value = await res.json()
})

async function openPlugin(p){

  // 動的ロード（簡易版）
  const module = await import(p.ui)

  currentView.value = module.default
}
</script>

<style>
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.card {
  border: 1px solid #ccc;
  padding: 20px;
  cursor: pointer;
}
</style>



