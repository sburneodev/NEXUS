import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import './styles/theme.css';
// Registro global de Chart.js — DEBE importarse antes que cualquier gráfico
import './config/chartConfig';
import './styles/ia-avatar.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
    throw new Error('[NEXUS] No se encontró el elemento #root en el DOM.');
}

createRoot(rootElement).render(
    <StrictMode>
        <App />
    </StrictMode>
);
