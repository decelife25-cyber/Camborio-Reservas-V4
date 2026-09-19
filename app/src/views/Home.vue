<template>
  <div class="space-y-6">
    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">Panel de Control</h2>
        <p class="text-gray-500 text-sm mt-1">Visión general del estado actual</p>
      </div>
      <div class="bg-amber-100 text-amber-800 p-3 rounded-full">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <router-link to="/today" class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-2 active:bg-gray-50 transition-colors">
        <span class="text-3xl font-bold text-gray-800">{{ todayCount }}</span>
        <span class="text-sm font-medium text-gray-500 uppercase tracking-wide">Reservas Hoy</span>
      </router-link>

      <router-link to="/pending" class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-2 active:bg-gray-50 transition-colors relative">
        <span class="text-3xl font-bold text-red-600">{{ pendingCount }}</span>
        <span class="text-sm font-medium text-gray-500 uppercase tracking-wide text-center">Por Confirmar</span>
        <span v-if="pendingCount > 0" class="absolute top-3 right-3 flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      </router-link>
    </div>

    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <h3 class="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Acciones Rápidas</h3>
      <div class="grid grid-cols-2 gap-3">
        <button class="bg-gray-100 text-gray-700 p-3 rounded-lg font-medium text-sm flex flex-col items-center justify-center space-y-1 active:bg-gray-200">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          <span>Nueva Reserva</span>
        </button>
        <button class="bg-gray-100 text-gray-700 p-3 rounded-lg font-medium text-sm flex flex-col items-center justify-center space-y-1 active:bg-gray-200">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <span>Buscar Cliente</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const todayCount = ref(0)
const pendingCount = ref(0)
</script>
