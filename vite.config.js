import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://openmindsbackend.onrender.com',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => {
          console.log(`[VITE-PROXY] Original path: ${path}`);
          // Keep the /api in the path but remove the leading slash to match FastAPI route
          // This is important because our backend routes actually include /api in them
          const newPath = path;
          console.log(`[VITE-PROXY] Rewritten path: ${newPath}`);
          return newPath;
        },
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('[VITE-PROXY] Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('[VITE-PROXY] Sending request to:', proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('[VITE-PROXY] Received response:', {
              path: req.url,
              status: proxyRes.statusCode
            });
          });
        }
      }
    }
  }
}) 