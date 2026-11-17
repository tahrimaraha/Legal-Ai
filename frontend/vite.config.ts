import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The browser always calls the relative `/api/v1/...`; Vite forwards it to the FastAPI backend
// (override with BACKEND_URL in frontend/.env.local if the API runs elsewhere).
// `host: true` exposes the dev/preview server on the LAN so a phone can open http://<PC-IP>:5173.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const proxy = { '/api': { target: env.BACKEND_URL || 'http://127.0.0.1:8000', changeOrigin: true, ws: true } };
  return {
    plugins: [react()],
    server: { port: 5173, host: true, proxy },
    preview: { port: 5173, host: true, proxy },
  };
});
