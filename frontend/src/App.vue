<script setup>
import ChatRoom from './components/ChatRoom.vue'
</script>

<template>
  <div id="app">
    <ChatRoom />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  height: 100vh;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #1a2a6c, #b21f1f, #1a2a6c);
  color: #fff;
}

body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>