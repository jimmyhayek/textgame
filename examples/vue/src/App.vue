<template>
  <div class="game-container" data-framework="vue">
    <GameView />
  </div>
</template>

<script setup lang="ts">
import GameView from './components/GameView.vue';
</script>

<style>
.game-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #333;
}
</style>