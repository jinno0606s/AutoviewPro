<script setup>
import { ref } from "vue"

const cam = ref({
  enabled: 0
})

function onToggle(camObj){
  console.log("BEFORE:", camObj.enabled)

  camObj.enabled = Number(camObj.enabled) === 1 ? 0 : 1

  console.log("AFTER:", camObj.enabled)
}
</script>

<template>
  <div style="padding:20px">

    <h3>TEST ENABLED</h3>

    <input
      type="checkbox"
      :checked="Number(cam.enabled) === 1"
      @change="onToggle(cam)"
    />

    <div>
      VALUE: {{ cam.enabled }}
    </div>

  </div>
</template>