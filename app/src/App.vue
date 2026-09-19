<template>
  <div class="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
    <!-- Top Navigation Bar -->
    <header class="bg-[#1A1A1A] text-white shadow-md p-4 sticky top-0 z-50 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <img src="/logocamborio_trans.png" alt="Camborio Logo" class="h-8 w-8 object-contain bg-white rounded-full p-1" />
        <h1 class="text-xl font-bold tracking-wide">Camborio Privado</h1>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-grow p-4 overflow-y-auto pb-24">
      <router-view />
    </main>

    <!-- Bottom Navigation Bar (for Mobile/APK feel) -->
    <nav class="bg-white border-t border-gray-200 fixed bottom-0 w-full flex justify-around items-center h-16 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-50">
      <router-link to="/" class="nav-item flex flex-col items-center justify-center w-full h-full text-gray-500" active-class="text-amber-600 font-semibold">
        <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
        <span class="text-[10px] uppercase tracking-wider">Inicio</span>
      </router-link>
      <router-link to="/calendar" class="nav-item flex flex-col items-center justify-center w-full h-full text-gray-500" active-class="text-amber-600 font-semibold">
        <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
        <span class="text-[10px] uppercase tracking-wider">Calendario</span>
      </router-link>
      <router-link to="/pending" class="nav-item flex flex-col items-center justify-center w-full h-full text-gray-500" active-class="text-amber-600 font-semibold relative">
        <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span class="text-[10px] uppercase tracking-wider">Pendientes</span>
        <span class="absolute top-2 right-6 h-2 w-2 bg-red-500 rounded-full"></span>
      </router-link>
    </nav>
  </div>
</template>

<script setup lang="ts">
// Main layout component
</script>

<style>
/* Basic transition for route changes if needed */
.nav-item {
  transition: all 0.2s ease-in-out;
}
</style>
