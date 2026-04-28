import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import LandingPage     from '../pages/LandingPage.vue'
import LoginPage       from '../pages/LoginPage.vue'
import MarketplacePage from '../pages/MarketplacePage.vue'
import ProfilePage     from '../pages/ProfilePage.vue'
import MyLoansPage     from '../pages/MyLoansPage.vue'
import DesignPage      from '../pages/DesignPage.vue'
import VerifyPortalPage from '../verify/VerifyPortalPage.vue'

declare module 'vue-router' {
  interface RouteMeta {
    hideNav?:     boolean
    requiresAuth?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',                 component: LandingPage },
    { path: '/login',            component: LoginPage,      meta: { hideNav: true } },
    { path: '/marketplace',      component: MarketplacePage },
    { path: '/my-loans',         component: MyLoansPage,    meta: { requiresAuth: true } },
    {
      // Redirect to the authenticated user's profile. Guard catches unauthenticated access.
      path: '/my-profile',
      redirect: () => {
        const auth = useAuth()
        return auth.address ? `/profile/${auth.address}` : '/login'
      },
      meta: { requiresAuth: true },
    },
    { path: '/profile/:address', component: ProfilePage },
    { path: '/design',           component: DesignPage },
    // -----------------------------------------------------------------------
    // Identity verification portal routes.
    // Kept isolated under /verify/* for clear ownership boundaries.
    // -----------------------------------------------------------------------
    { path: '/verify',           redirect: '/verify/portal', meta: { hideNav: true } },
    { path: '/verify/portal',    component: VerifyPortalPage, meta: { hideNav: true } },
  ],
})

// Guard: only /my-loans and /my-profile require auth. Everything else is public.
router.beforeEach((to) => {
  if (to.meta.requiresAuth) {
    const auth = useAuth()
    if (!auth.isConnected) return '/login'
  }
})

export default router
