import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';

const rootElement = document.getElementById('root');

if (rootElement === null) {
    throw new Error('[NEXUS] Elemento #root no encontrado en el DOM.');
}

createRoot(rootElement).render(
    <StrictMode>
        <App />
    </StrictMode>
);
