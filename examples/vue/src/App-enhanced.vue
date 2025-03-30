<template>
  <div class="app-container" data-framework="vue">
    <EnhancedGameView />
  </div>
</template>

<script setup lang="ts">
import EnhancedGameView from './components/EnhancedGameView.vue';
</script>

<style>
:root {
  --primary-color: #3498db;
  --secondary-color: #2ecc71;
  --text-color: #2c3e50;
  --background-color: #f5f7fa;
  --border-color: #e0e0e0;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background-color: var(--background-color);
}

.app-container {
  width: 100%;
  min-height: 100vh;
  padding: 1rem;
}

button {
  cursor: pointer;
}

h1, h2, h3, h4, h5, h6 {
  font-weight: 600;
}

/* Utility classes */
.text-center {
  text-align: center;
}

.mt-1 { margin-top: 0.25rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-3 { margin-top: 1rem; }
.mt-4 { margin-top: 1.5rem; }
.mt-5 { margin-top: 2rem; }

.mb-1 { margin-bottom: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 1rem; }
.mb-4 { margin-bottom: 1.5rem; }
.mb-5 { margin-bottom: 2rem; }
</style>