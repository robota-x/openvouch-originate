import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index'
import './style.css'
import { Buffer } from 'buffer'

// Solana/Anchor browser polyfill
if (typeof window !== 'undefined') {
  window.Buffer = Buffer
}

createApp(App).use(router).mount('#app')
