<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between pb-2 border-b border-red-100">
      <h2 class="text-xl font-bold text-gray-800 flex items-center">
        <span class="text-red-500 mr-2">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </span>
        Por Confirmar
      </h2>
    </div>

    <div v-if="reservationsStore.isLoading" class="flex justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
    </div>

    <div v-else-if="pendingList.length === 0" class="text-center text-gray-500 py-10 bg-gray-50 rounded-xl border border-gray-100">
      <svg class="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      ¡Todo al día! No hay reservas pendientes.
    </div>

    <div v-else class="space-y-3">
      <ReservationCard
        v-for="res in pendingList"
        :key="res.id"
        :reservation="res"
        showActions
      >
        <template #actions>
          <div class="flex space-x-2">
            <button class="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm border border-green-200 active:bg-green-100">Confirmar</button>
            <button class="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-sm border border-red-200 active:bg-red-100">Rechazar</button>
          </div>
        </template>
      </ReservationCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useReservationStore } from '../stores/reservations'
import ReservationCard from '../components/ReservationCard.vue'

const reservationsStore = useReservationStore()
const pendingList = computed(() => reservationsStore.pendingReservations)

onMounted(() => {
  if (reservationsStore.reservations.length === 0) {
    reservationsStore.fetchReservations()
  }
})
</script>
