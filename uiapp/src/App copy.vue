<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <div>
    <nav style="padding:10px; background:#222;">
      <router-link to="/" style="color:white; margin-right:15px;">Dashboard</router-link>
      <router-link to="/camera" style="color:white; margin-right:15px;">Camera</router-link>
      <router-link to="/layout" style="color:white;">Layout</router-link>
    </nav>

    <RouterView />
  </div>
</template>