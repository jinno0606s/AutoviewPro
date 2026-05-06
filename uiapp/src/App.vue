<!-- App.vue -->
<template>
  <div class="app-shell">
    <nav class="nav">
      <router-link to="/">Dashboard</router-link>
      <router-link to="/cameras">Cameras</router-link>
      <router-link to="/speakers">Speakers</router-link>
      <router-link to="/layouts">Layouts</router-link>
      <router-link to="/manual-event">Events</router-link>
      <router-link to="/monitoring-center">Monitoring</router-link>
      <router-link to="/init">Init</router-link>

    </nav>   
    <router-view />
  </div>
</template>



<style>
html, body {
  margin:0;
  padding:0;
  width:100%;
  height:100%;
  background:#202020;
}

#app {
  min-height:100vh;
  background:#202020;
}

.nav{
background:#222;
padding:10px;
display:flex;
gap:10px;
}

.nav a{
color:white;
text-decoration:none;
padding:6px 10px;
background:#444;
border-radius:4px;
}

.nav a.router-link-active{
background:#0080ff;
}
</style>


