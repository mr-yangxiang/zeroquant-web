import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  base: '/zeroquant/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3003,
    host: true,
    proxy: {
      '/zeroquant/api': {
        target: process.env.ZEROQUANT_DEV_API ?? 'http://127.0.0.1:3002',
        rewrite: (url: string) => url.replace(/^\/zeroquant/, ''),
      },
    },
  },
})
