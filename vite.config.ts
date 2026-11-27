import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Expose VITE_*, REACT_APP_* and API_* env vars to the client so the API
// base URL can be supplied as VITE_API_BASE_URL, REACT_APP_API_BASE_URL or
// API_BASE_URL (see src/api.ts for the resolution order).
export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'REACT_APP_', 'API_'],
})
