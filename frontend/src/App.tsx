import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage }         from './pages/LoginPage';
import { DashboardPage }     from './pages/DashboardPage';
import { ProductosPage }     from './pages/ProductosPage';
import { StockPage }         from './pages/StockPage';
import { BovedaRetroPage }   from './pages/BovedaRetroPage';
import { AlmacenPage }       from './pages/AlmacenPage';
import { ClientesPage }      from './pages/ClientesPage';
import { ProveedoresPage }   from './pages/ProveedoresPage';
import { UsuariosPage }      from './pages/UsuariosPage';
import { AuditoriaPage }     from './pages/AuditoriaPage';
import { Layout }            from './components/layout/Layout';
import { ProtectedRoute }    from './components/auth/ProtectedRoute';
import { AiPanelProvider }   from './context/AiPanelContext';
import { AuthProvider }      from './context/AuthContext';

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
        <BrowserRouter>
            {/*
              AuthProvider debe vivir DENTRO de BrowserRouter porque
              internamente usa useNavigate() para las redirecciones de
              logout y token expirado.

              Al estar aquí, un único estado de autenticación es
              compartido por TODOS los componentes del árbol:
              ProtectedRoute, Navbar, páginas — sin estados residuales
              de sesiones anteriores.
            */}
            <AuthProvider>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<LoginPage />} />

                <Route element={<ProtectedRoute />}>
                    <Route element={<Layout />}>
                        <Route path="/dashboard"   element={<DashboardPage />} />
                        <Route path="/productos"   element={<ProductosPage />} />
                        <Route path="/clientes"    element={<ClientesPage />} />
                        <Route path="/proveedores" element={<ProveedoresPage />} />
                        <Route path="/stock"       element={<StockPage />} />
                        <Route path="/boveda"      element={<BovedaRetroPage />} />
                        <Route path="/almacen"     element={<AlmacenPage />} />
                        <Route path="/ai"          element={<ComingSoon name="IA & Analytics" />} />
                    </Route>
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                    <Route element={<Layout />}>
                        <Route path="/usuarios"  element={<UsuariosPage />} />
                        <Route path="/auditoria" element={<AuditoriaPage />} />
                    </Route>
                </Route>

                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            </AuthProvider>
        </BrowserRouter>
        </AiPanelProvider>
    );
}

export default App;
