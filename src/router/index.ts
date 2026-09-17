import { createRouter, createWebHashHistory } from 'vue-router'
import { ensureSession } from '../api/session'
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: Login,
    },
    {
      path: '/',
      name: 'Dashboard',
      component: Dashboard,
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  if (to.meta.requiresAuth && !await ensureSession()) {
    next('/login')
  } else {
    next()
  }
})

export default router
