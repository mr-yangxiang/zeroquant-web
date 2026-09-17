import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './test/browser', workers: 1, timeout: 45000,
  use: { baseURL: 'http://localhost:3003/zeroquant/', headless: true },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --strictPort',
    url: 'http://localhost:3003/zeroquant/', reuseExistingServer: false,
    env: { ZEROQUANT_DEV_API: 'http://127.0.0.1:3102' },
  },
})
