var _a;
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 5173,
        allowedHosts: true,
        proxy: {
            '/api': {
                target: (_a = process.env.VITE_API_TARGET) !== null && _a !== void 0 ? _a : 'http://localhost:8787',
                changeOrigin: true,
            },
        },
    },
});
