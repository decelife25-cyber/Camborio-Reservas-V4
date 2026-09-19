<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between pb-2 border-b">
      <h2 class="text-xl font-bold text-gray-800">Reservas de Hoy</h2>
      <button @click="reservationsStore.fetchReservations()" class="text-amber-600 p-2 rounded-full hover:bg-amber-50">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
      </button>
    </div>

    <div v-if="reservationsStore.isLoading" class="flex justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
    </div>

    <div v-else-if="reservationsStore.error" class="bg-red-50 text-red-600 p-4 rounded-lg">
      {{ reservationsStore.error }}
    </div>

    <div v-else-if="todayList.length === 0" class="text-center text-gray-500 py-10">
      No hay reservas para mostrar hoy.
    </div>

    <div v-else class="space-y-3">
      <ReservationCard
        v-for="res in todayList"
        :key="res.id"
        :reservation="res"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useReservationStore } from '../stores/reservations'
import ReservationCard from '../components/ReservationCard.vue'

const reservationsStore = useReservationStore()
const todayList = computed(() => reservationsStore.todayReservations)

onMounted(() => {
  reservationsStore.fetchReservations()
})
</script>
