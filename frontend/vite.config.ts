import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [react()],

        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },

        server: {
            port: 5173,
            strictPort: true,
            // Necesario para que React Router funcione al refrescar la página
            // Sin esto, rutas como /dashboard devuelven 404 al hacer F5
            historyApiFallback: true,
            proxy: {
                '/api': {
                    target: env['VITE_API_BASE_URL'] ?? 'http://localhost:8080',
                    changeOrigin: true,
                    secure: false,
                },
            },
        },

        build: {
            sourcemap: mode === 'development',
            chunkSizeWarningLimit: 500,
            rollupOptions: {
                output: {
                    manualChunks: {
                        vendor: ['react', 'react-dom'],
                        router: ['react-router-dom'],
                        http: ['axios'],
                    },
                },
            },
        },

        define: {
            __APP_VERSION__: JSON.stringify(env['VITE_APP_VERSION'] ?? '1.1.0'),
        },
    };
});