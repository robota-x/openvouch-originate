import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),  // must precede vue()
    vue(),
  ],
  test: {
    environment: 'happy-dom',
  },
})
