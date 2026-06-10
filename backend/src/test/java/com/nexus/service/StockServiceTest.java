package com.nexus.service;

import com.nexus.audit.AuditService;
import com.nexus.dto.StockMovimientoRequest;
import com.nexus.model.Cliente;
import com.nexus.model.Proveedor;
import com.nexus.model.Usuario;
import com.nexus.repository.ClienteRepository;
import com.nexus.repository.ProveedorRepository;
import com.nexus.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import com.nexus.dto.StockMovimientoResponse;
import java.math.BigDecimal;
import java.sql.CallableStatement;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StockServiceTest {

    @Mock private AuditService        auditService;
    @Mock private JdbcTemplate        jdbcTemplate;
    @Mock private UsuarioRepository   usuarioRepository;
    @Mock private ClienteRepository   clienteRepository;
    @Mock private ProveedorRepository proveedorRepository;

    @InjectMocks
    private StockService stockService;

    @BeforeEach
    void setUp() { SecurityContextHolder.clearContext(); }

    private void mockUsuarioAutenticado(String email, Long id) {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getName()).thenReturn(email);
        SecurityContext ctx = mock(SecurityContext.class);
        when(ctx.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(ctx);

        Usuario u = new Usuario();
        u.setEmail(email);
        try {
            var f = Usuario.class.getDeclaredField("id");
            f.setAccessible(true);
            f.set(u, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
        when(usuarioRepository.findByEmail(email)).thenReturn(Optional.of(u));
    }

    private void mockClienteActivo(Long id) {
        Cliente c = new Cliente(); c.setActivo(true);
        when(clienteRepository.findById(id)).thenReturn(Optional.of(c));
    }

    private void mockProveedorActivo(Long id) {
        Proveedor p = new Proveedor(); p.setActivo(true);
        when(proveedorRepository.findById(id)).thenReturn(Optional.of(p));
    }

    private void mockJdbcSp(String resultado, int stockNuevo) throws Exception {
        CallableStatement cs = mock(CallableStatement.class);
        when(cs.getString(10)).thenReturn(resultado);
        when(cs.getInt(11)).thenReturn(stockNuevo);
        doAnswer(inv -> {
            Object cb = inv.getArgument(1);
            try {
                cb.getClass().getMethod("doInCallableStatement", CallableStatement.class).invoke(cb, cs);
            } catch (java.lang.reflect.InvocationTargetException e) {
                if (e.getCause() instanceof RuntimeException re) throw re;
                throw new RuntimeException(e.getCause());
            }
            return null;
        }).when(jdbcTemplate).execute(anyString(),
                any(org.springframework.jdbc.core.CallableStatementCallback.class));
    }

    private StockMovimientoRequest requestSalida(Long idProducto, int cantidad) {
        StockMovimientoRequest r = new StockMovimientoRequest();
        r.setIdProducto(idProducto); r.setIdCliente(1L);
        r.setTipoMovimiento("SALIDA"); r.setCantidad(cantidad);
        r.setPrecioUnitario(new BigDecimal("59.99")); r.setReferencia("VTA-TEST-001");
        return r;
    }

    private StockMovimientoRequest requestEntrada(Long idProducto, int cantidad) {
        StockMovimientoRequest r = new StockMovimientoRequest();
        r.setIdProducto(idProducto); r.setIdProveedor(1L);
        r.setTipoMovimiento("ENTRADA"); r.setCantidad(cantidad);
        r.setPrecioUnitario(new BigDecimal("29.99")); r.setReferencia("ALB-TEST-001");
        return r;
    }

    @Test
    void registrarMovimiento_ventaExitosa_devuelveOkYStockNuevo() throws Exception {
        mockClienteActivo(1L);
        mockUsuarioAutenticado("cajero@levelupnexus.es", 3L);
        mockJdbcSp("OK: 5 → 4", 4);

        StockMovimientoResponse r = stockService.registrarMovimiento(requestSalida(1L, 1));

        assertNotNull(r);
        assertTrue(r.getResultado().startsWith("OK"));
        assertEquals(4, r.getStockNuevo());
    }

    @Test
    void registrarMovimiento_entradaProveedor_devuelveOk() throws Exception {
        mockProveedorActivo(1L);
        mockUsuarioAutenticado("gestor@levelupnexus.es", 2L);
        mockJdbcSp("OK: 10 → 20", 20);

        StockMovimientoResponse r = stockService.registrarMovimiento(requestEntrada(2L, 10));

        assertTrue(r.getResultado().startsWith("OK"));
        assertEquals(20, r.getStockNuevo());
        verifyNoInteractions(clienteRepository);
    }

    @Test
    void registrarMovimiento_ajusteManual_devuelveOk() throws Exception {
        mockUsuarioAutenticado("gestor@levelupnexus.es", 2L);
        mockJdbcSp("OK: 8 → 10", 10);

        StockMovimientoRequest req = new StockMovimientoRequest();
        req.setIdProducto(3L); req.setTipoMovimiento("AJUSTE");
        req.setCantidad(2); req.setNotas("Corrección tras recuento");

        assertTrue(stockService.registrarMovimiento(req).getResultado().startsWith("OK"));
        verifyNoInteractions(clienteRepository);
        verifyNoInteractions(proveedorRepository);
    }

    @Test
    void registrarMovimiento_stockInsuficiente_lanza409() throws Exception {
        mockClienteActivo(1L);
        mockUsuarioAutenticado("cajero@levelupnexus.es", 3L);
        mockJdbcSp("ERROR: Stock insuficiente. Disponible: 0", 0);

        var req = requestSalida(1L, 5);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> stockService.registrarMovimiento(req));

        assertEquals(409, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("Stock insuficiente"));
    }

    @Test
    void registrarMovimiento_articuloRetroAgotado_lanza409ConMensajeRetro() throws Exception {
        mockClienteActivo(1L);
        mockUsuarioAutenticado("cajero@levelupnexus.es", 3L);
        mockJdbcSp("ERROR: Stock insuficiente. Disponible: 0 | Pieza RETRO única: ya fue vendida.", 0);

        var req = requestSalida(99L, 1);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> stockService.registrarMovimiento(req));

        assertEquals(409, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("RETRO"));
    }

    @Test
    void registrarMovimiento_productoNoEncontrado_lanza409() throws Exception {
        mockClienteActivo(1L);
        mockUsuarioAutenticado("cajero@levelupnexus.es", 3L);
        mockJdbcSp("ERROR: Producto no encontrado id=999", -1);

        var req = requestSalida(999L, 1);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> stockService.registrarMovimiento(req));

        assertEquals(409, ex.getStatusCode().value());
    }

    @Test
    void registrarMovimiento_sinAutenticacion_lanza401() {
        mockClienteActivo(1L);
        SecurityContext ctx = mock(SecurityContext.class);
        when(ctx.getAuthentication()).thenReturn(null);
        SecurityContextHolder.setContext(ctx);

        var req = requestSalida(1L, 1);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> stockService.registrarMovimiento(req));

        assertEquals(401, ex.getStatusCode().value());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void registrarMovimiento_clienteNoExistente_lanza422() {
        when(clienteRepository.findById(1L)).thenReturn(Optional.empty());

        var req = requestSalida(1L, 1);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> stockService.registrarMovimiento(req));

        assertEquals(422, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("cliente"));
        verifyNoInteractions(jdbcTemplate);
        verifyNoInteractions(usuarioRepository);
    }

    @Test
    void registrarMovimiento_clienteInactivo_lanza422() {
        Cliente c = new Cliente(); c.setActivo(false);
        when(clienteRepository.findById(1L)).thenReturn(Optional.of(c));

        var req = requestSalida(1L, 1);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> stockService.registrarMovimiento(req));

        assertEquals(422, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("cliente"));
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void registrarMovimiento_proveedorNoExistente_lanza422() {
        when(proveedorRepository.findById(1L)).thenReturn(Optional.empty());

        var req = requestEntrada(1L, 5);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> stockService.registrarMovimiento(req));

        assertEquals(422, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("proveedor"));
        verifyNoInteractions(jdbcTemplate);
        verifyNoInteractions(usuarioRepository);
    }

    @Test
    void registrarMovimiento_proveedorInactivo_lanza422() {
        Proveedor p = new Proveedor(); p.setActivo(false);
        when(proveedorRepository.findById(1L)).thenReturn(Optional.of(p));

        var req = requestEntrada(1L, 5);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> stockService.registrarMovimiento(req));

        assertEquals(422, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("proveedor"));
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void registrarMovimiento_concurrencia_primeraVentaExitosaSegundaFalla() throws Exception {
        mockClienteActivo(1L);
        mockUsuarioAutenticado("cajero@levelupnexus.es", 3L);
        mockJdbcSp("OK: 1 → 0", 0);

        StockMovimientoResponse primera = stockService.registrarMovimiento(requestSalida(99L, 1));
        assertTrue(primera.getResultado().startsWith("OK"));
        assertEquals(0, primera.getStockNuevo());

        reset(jdbcTemplate);
        mockJdbcSp("ERROR: Stock insuficiente. Disponible: 0 | Pieza RETRO única: ya fue vendida.", 0);

        var req2 = requestSalida(99L, 1);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> stockService.registrarMovimiento(req2));

        assertEquals(409, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("RETRO"));
    }
}