<template>
  <div class="p-4">

    <h2>タイムラプス</h2>

    <div>
      <select v-model="cameraId">
        <option v-for="c in cameras" :key="c.id" :value="c.id">
          {{ c.name }}
        </option>
      </select>

      <button @click="run">撮影テスト</button>
    </div>

    <div v-if="images.length">
      <h3>プレビュー</h3>

      <img
        v-for="img in images"
        :key="img"
        :src="baseUrl + '/' + img"
        style="width:200px;margin:5px;"
      />
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"

const cameras = ref([])
const cameraId = ref(1)
const images = ref([])

const baseUrl = "http://192.168.1.196:8080"

onMounted(async ()=>{
  const res = await fetch(baseUrl + "/api/cameras")
  cameras.value = await res.json()
})

async function run(){

  const res = await fetch(baseUrl + "/api/timelapse/run",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ camera_id: cameraId.value })
  })

  const data = await res.json()

  console.log(data)

  if(data.length && data[0].meta){
    images.value.unshift(data[0].meta.file)
  }
}
</script>