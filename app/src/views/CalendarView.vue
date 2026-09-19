<template>
  <div class="space-y-6">
    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <h2 class="text-xl font-bold text-gray-800 mb-4">Calendario de Reservas</h2>

      <div class="flex items-center space-x-4 mb-4">
        <input
          type="date"
          v-model="selectedDate"
          class="border border-gray-300 rounded-lg p-2 flex-grow focus:ring-amber-500 focus:border-amber-500"
        >
      </div>

      <div class="flex bg-gray-100 p-1 rounded-lg">
        <button
          @click="selectedTurn = 'COMIDA'"
          class="flex-1 py-2 text-sm font-medium rounded-md transition-colors"
          :class="selectedTurn === 'COMIDA' ? 'bg-white shadow text-amber-700' : 'text-gray-500 hover:text-gray-700'"
        >
          COMIDA
        </button>
        <button
          @click="selectedTurn = 'CENA'"
          class="flex-1 py-2 text-sm font-medium rounded-md transition-colors"
          :class="selectedTurn === 'CENA' ? 'bg-white shadow text-amber-700' : 'text-gray-500 hover:text-gray-700'"
        >
          CENA
        </button>
      </div>
    </div>

    <div v-if="reservationsStore.isLoading" class="flex justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
    </div>

    <div v-else-if="filteredReservations.length === 0" class="text-center text-gray-500 py-10">
      No hay reservas para {{ selectedDate }} ({{ selectedTurn }}).
    </div>

    <div v-else class="space-y-3">
      <ReservationCard
        v-for="res in filteredReservations"
        :key="res.id"
        :reservation="res"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useReservationStore } from '../stores/reservations'
import ReservationCard from '../components/ReservationCard.vue'

const reservationsStore = useReservationStore()

const today = new Date().toISOString().split('T')[0]
const selectedDate = ref(today)
const selectedTurn = ref<'COMIDA' | 'CENA'>('COMIDA')

const filteredReservations = computed(() => {
  return reservationsStore.getReservationsByDateAndTurn(selectedDate.value, selectedTurn.value)
})

watch(selectedDate, () => {
  reservationsStore.fetchReservations()
})

onMounted(() => {
  reservationsStore.fetchReservations()
})
</script>
