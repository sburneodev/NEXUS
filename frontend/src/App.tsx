import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage }              from './pages/LoginPage';
import { DashboardPage }          from './pages/DashboardPage';
import { ProductosPage }          from './pages/ProductosPage';
import { StockPage }              from './pages/StockPage';
import { BovedaRetroPage }        from './pages/BovedaRetroPage';
import { AlmacenPage }            from './pages/AlmacenPage';
import { ClientesPage }           from './pages/ClientesPage';
import { ProveedoresPage }        from './pages/ProveedoresPage';
import { UsuariosPage }           from './pages/UsuariosPage';
import { AuditoriaPage }          from './pages/AuditoriaPage';
import { AlbaranPreviewPage }     from './pages/AlbaranPreviewPage';
import { AlbaranesRangoPage }     from './pages/AlbaranesRangoPage';
import { Layout }                 from './components/layout/Layout';
import { ProtectedRoute }         from './components/auth/ProtectedRoute';
import { AiPanelProvider }        from './context/AiPanelContext';
import { AiPage }                 from './pages/AiPage';
import './styles/ia-avatar.css';
import { AuthProvider }           from './context/AuthContext';
import { CookieBanner }          from './components/cookies/CookieBanner';

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
        <AiPanelProvider>
        <CookieBanner />
        <BrowserRouter>
            <AuthProvider>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<LoginPage />} />

                {/* Rutas para todos los usuarios autenticados */}
                <Route element={<ProtectedRoute />}>
                    <Route element={<Layout />}>
                        <Route path="/dashboard"   element={<DashboardPage />} />
                        <Route path="/productos"   element={<ProductosPage />} />
                        <Route path="/clientes"    element={<ClientesPage />} />
                        <Route path="/proveedores" element={<ProveedoresPage />} />
                        <Route path="/stock"       element={<StockPage />} />
                        <Route path="/boveda"      element={<BovedaRetroPage />} />
                        <Route path="/almacen"     element={<AlmacenPage />} />
                        <Route path="/ai"          element={<AiPage />} />
                    </Route>
                </Route>

                {/* Rutas para ADMIN únicamente */}
                <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                    <Route element={<Layout />}>
                        <Route path="/usuarios"  element={<UsuariosPage />} />
                        <Route path="/auditoria" element={<AuditoriaPage />} />
                    </Route>
                </Route>

                {/* Albaranes por rango — ADMIN, GESTOR_INVENTARIO, CONTABLE */}
                <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'GESTOR_INVENTARIO', 'CONTABLE']} />}>
                    <Route element={<Layout />}>
                        <Route path="/albaranes-rango" element={<AlbaranesRangoPage />} />
                    </Route>
                </Route>

                {/* Ruta pública temporal de previsualización */}
                <Route path="/albaran-preview" element={<AlbaranPreviewPage />} />

                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            </AuthProvider>
        </BrowserRouter>
        </AiPanelProvider>
    );
}

export default App;