import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const packageVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')).version

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
