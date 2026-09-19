import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomeView from '../views/Home.vue'
import TodayReservationsView from '../views/TodayReservations.vue'
import PendingReservationsView from '../views/PendingReservations.vue'
import CalendarView from '../views/CalendarView.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: HomeView
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: CalendarView
  },
  {
    path: '/today',
    name: 'TodayReservations',
    component: TodayReservationsView
  },
  {
    path: '/pending',
    name: 'PendingReservations',
    component: PendingReservationsView
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
