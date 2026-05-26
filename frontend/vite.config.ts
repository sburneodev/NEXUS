import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Carga las variables VITE_* del .env según el modo (development / production)
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [react()],

        // Alias @/ → src/ (coincide con tsconfig paths)
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },

        // En development el proxy evita CORS contra el backend en :8080
        // En production Nginx hace el proxy (ver nginx.conf)
        server: {
            port: 5173,
            strictPort: true,
            proxy: {
                '/api': {
                    target: env['VITE_API_BASE_URL'] ?? 'http://localhost:8080',
                    changeOrigin: true,
                    secure: false,
                },
            },
        },

        build: {
            // Genera sourcemaps solo en desarrollo para no exponer código en producción
            sourcemap: mode === 'development',
            // Alerta si un chunk supera 500 KB
            chunkSizeWarningLimit: 500,
            rollupOptions: {
                output: {
                    // Divide vendor de código propio para mejor caché
                    manualChunks: {
                        vendor: ['react', 'react-dom'],
                        router: ['react-router-dom'],
                        http: ['axios'],
                    },
                },
            },
        },

        // Variables de entorno accesibles en el código como import.meta.env.*
        define: {
            __APP_VERSION__: JSON.stringify(env['VITE_APP_VERSION'] ?? '1.1.0'),
        },
    };
});