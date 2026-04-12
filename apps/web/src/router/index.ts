import { createRouter, createWebHistory } from 'vue-router'
import LandingPage     from '../pages/LandingPage.vue'
import LoginPage       from '../pages/LoginPage.vue'
import MarketplacePage from '../pages/MarketplacePage.vue'
import ProfilePage     from '../pages/ProfilePage.vue'
import MyLoansPage     from '../pages/MyLoansPage.vue'
import DesignPage      from '../pages/DesignPage.vue'

declare module 'vue-router' {
  interface RouteMeta { hideNav?: boolean }
}

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',                 component: LandingPage },
    { path: '/login',            component: LoginPage,      meta: { hideNav: true } },
    { path: '/marketplace',      component: MarketplacePage },
    { path: '/my-loans',         component: MyLoansPage },
    { path: '/profile/:address', component: ProfilePage },
    { path: '/design',           component: DesignPage },
  ],
})
