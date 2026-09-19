import { defineStore } from 'pinia'

export interface Reservation {
  id: string
  codigo_reserva: string
  cliente: { nombre: string, telefono: string }
  fecha: string
  hora: string
  turno: 'COMIDA' | 'CENA'
  estado: 'PENDIENTE' | 'CONFIRMADA' | 'SENTADA' | 'FINALIZADA' | 'CANCELADA_CLIENTE' | 'CANCELADA_LOCAL' | 'NO_PRESENTADO'
  personas: number
  mesa?: string
  notas?: string
}

export const useReservationStore = defineStore('reservations', {
  state: () => ({
    reservations: [] as Reservation[],
    isLoading: false,
    error: null as string | null
  }),

  getters: {
    todayReservations: (state) => {
      return state.reservations.filter(r =>
        ['PENDIENTE', 'CONFIRMADA', 'SENTADA'].includes(r.estado)
      )
    },
    pendingReservations: (state) => {
      return state.reservations.filter(r => r.estado === 'PENDIENTE')
    },
    getReservationsByDateAndTurn: (state) => {
      return (date: string, turn: 'COMIDA' | 'CENA') => {
        return state.reservations.filter(r => r.fecha === date && r.turno === turn)
      }
    }
  },

  actions: {
    async fetchReservations() {
      this.isLoading = true
      this.error = null
      try {
        // Mock data for UI building
        this.reservations = [
          {
            id: '1',
            codigo_reserva: 'A1B2',
            cliente: { nombre: 'Juan Pérez', telefono: '600123456' },
            fecha: new Date().toISOString().split('T')[0],
            hora: '14:30',
            turno: 'COMIDA',
            estado: 'PENDIENTE',
            personas: 4
          },
          {
            id: '2',
            codigo_reserva: 'C3D4',
            cliente: { nombre: 'María García', telefono: '611987654' },
            fecha: new Date().toISOString().split('T')[0],
            hora: '21:00',
            turno: 'CENA',
            estado: 'CONFIRMADA',
            personas: 2,
            mesa: '15'
          }
        ]
      } catch (e: any) {
        this.error = e.message
      } finally {
        this.isLoading = false
      }
    }
  }
})
