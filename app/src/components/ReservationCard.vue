<template>
  <BaseCard>
    <div class="flex justify-between items-start mb-2">
      <div class="flex items-center space-x-2">
        <span class="text-xs font-bold px-2 py-1 rounded bg-gray-100 text-gray-700">
          {{ reservation.hora }}
        </span>
        <span class="text-xs font-bold px-2 py-1 rounded" :class="statusBadgeClass">
          {{ reservation.estado }}
        </span>
      </div>
      <span class="text-xs text-gray-400 font-mono tracking-wider">{{ reservation.codigo_reserva }}</span>
    </div>

    <div class="mb-3">
      <h3 class="font-bold text-gray-800 text-lg">{{ reservation.cliente.nombre }}</h3>
      <div class="flex items-center text-sm text-gray-500 mt-1 space-x-4">
        <span class="flex items-center">
          <svg class="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          {{ reservation.personas }} pax
        </span>
        <span class="flex items-center">
          <svg class="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
          <a :href="'tel:' + reservation.cliente.telefono" class="text-blue-600">{{ reservation.cliente.telefono }}</a>
        </span>
      </div>
    </div>

    <div class="pt-3 border-t border-gray-100 flex justify-between items-center text-sm">
      <div class="flex items-center">
        <span class="text-gray-500 mr-2">Mesa:</span>
        <span v-if="reservation.mesa" class="font-bold text-gray-800 bg-gray-100 px-2 rounded">{{ reservation.mesa }}</span>
        <span v-else class="text-amber-600 font-medium italic">Sin asignar</span>
      </div>

      <div v-if="showActions">
        <slot name="actions"></slot>
      </div>
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseCard from './BaseCard.vue'
import type { Reservation } from '../stores/reservations'

const props = withDefaults(defineProps<{
  reservation: Reservation
  showActions?: boolean
}>(), {
  showActions: false
})

const statusBadgeClass = computed(() => {
  switch (props.reservation.estado) {
    case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
    case 'CONFIRMADA': return 'bg-green-100 text-green-800 border border-green-200'
    case 'SENTADA': return 'bg-blue-100 text-blue-800 border border-blue-200'
    case 'FINALIZADA': return 'bg-gray-100 text-gray-600 border border-gray-200'
    case 'CANCELADA_CLIENTE':
    case 'CANCELADA_LOCAL':
    case 'NO_PRESENTADO': return 'bg-red-100 text-red-800 border border-red-200'
    default: return 'bg-gray-100 text-gray-800'
  }
})
</script>
