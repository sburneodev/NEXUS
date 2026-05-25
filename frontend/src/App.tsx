import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { Layout } from './components/layout/Layout';

/* ──────────────────────────────────────────────────────────────────
    App — Router principal de NEXUS ERP.

    Estructura de rutas:
        /login          → LoginPage (pública, con Space Invaders de fondo)
        /               → redirige a /login
        /dashboard      → DashboardPage (protegida — FE-07 añadirá ProtectedRoute)
        /productos      → placeholder hasta CRUD pages
        / clientes       → placeholder
        ...

    FE-07 (ProtectedRoute) envolverá el Layout para verificar JWT.
    Por ahora el acceso es libre para poder desarrollar las páginas.
────────────────────────────────────────────────────────────────── */

/* Placeholder temporal para rutas pendientes */
function ComingSoon({ name }: { name: string }): JSX.Element {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '48px',
                    marginBottom: '12px',
                    opacity: 0.2,
                }}>◈</div>
                <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '14px',
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                }}>
                    {name}
                </div>
                <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.06em',
                }}>
                    MÓDULO EN DESARROLLO
                </div>
            </div>
        </div>
    );
}

function App(): JSX.Element {
    return (
        <BrowserRouter>
            <Routes>

                {/* Raíz → login */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Pantalla de login */}
                <Route path="/login" element={<LoginPage />} />

                {/* Shell del ERP — FE-07 envolverá esto con ProtectedRoute */}
                <Route element={<Layout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/productos" element={<ComingSoon name="Productos" />} />
                    <Route path="/clientes" element={<ComingSoon name="Clientes" />} />
                    <Route path="/proveedores" element={<ComingSoon name="Proveedores" />} />
                    <Route path="/stock" element={<ComingSoon name="Control de Stock" />} />
                    <Route path="/boveda" element={<ComingSoon name="La Bóveda Retro" />} />
                    <Route path="/ai" element={<ComingSoon name="IA & Analytics" />} />
                    <Route path="/usuarios" element={<ComingSoon name="Gestión de Usuarios" />} />
                </Route>

                {/* Catch-all → login */}
                <Route path="*" element={<Navigate to="/login" replace />} />

            </Routes>
        </BrowserRouter>
    );
}

export default App;
