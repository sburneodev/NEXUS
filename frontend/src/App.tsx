import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage }         from './pages/LoginPage';
import { DashboardPage }     from './pages/DashboardPage';
import { ProductosPage }     from './pages/ProductosPage';
import { BovedaRetroPage }   from './pages/BovedaRetroPage';
import { Layout }            from './components/layout/Layout';
import { ProtectedRoute }    from './components/auth/ProtectedRoute';

function ComingSoon({ name }: { name: string }): JSX.Element {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '48px', marginBottom: '12px', opacity: 0.2 }}>◈</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, letterSpacing: '0.16em', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>{name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>MÓDULO EN DESARROLLO</div>
            </div>
        </div>
    );
}

function App(): JSX.Element {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<LoginPage />} />

                <Route element={<ProtectedRoute />}>
                    <Route element={<Layout />}>
                        <Route path="/dashboard"   element={<DashboardPage />} />
                        <Route path="/productos"   element={<ProductosPage />} />
                        <Route path="/boveda"      element={<BovedaRetroPage />} />
                        <Route path="/clientes"    element={<ComingSoon name="Clientes" />} />
                        <Route path="/proveedores" element={<ComingSoon name="Proveedores" />} />
                        <Route path="/stock"       element={<ComingSoon name="Control de Stock" />} />
                        <Route path="/ai"          element={<ComingSoon name="IA & Analytics" />} />
                    </Route>
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                    <Route element={<Layout />}>
                        <Route path="/usuarios" element={<ComingSoon name="Gestión de Usuarios" />} />
                    </Route>
                </Route>

                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
