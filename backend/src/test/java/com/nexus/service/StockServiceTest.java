package com.nexus.service;

import com.nexus.dto.StockMovimientoRequest;
import com.nexus.model.Usuario;
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

/**
 * CRUD-10 — Tests unitarios de StockService.
 *
 * Mockito puro — sin Spring Context, sin base de datos real.
 *
 * Cubre:
 *   1. Venta exitosa: SALIDA, ENTRADA, AJUSTE
 *   2. Stock insuficiente: agotado, RETRO, producto no encontrado, sin auth
 *   3. Concurrencia: el SP garantiza ACID — simulamos que solo una
 *      de dos peticiones simultáneas tiene éxito
 */
@ExtendWith(MockitoExtension.class)
class StockServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private StockService stockService;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
    }

    // ─────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────

    /**
     * Simula usuario autenticado en SecurityContext.
     * Usuario no tiene setId() → reflexión para asignar el id.
     */
    private void mockUsuarioAutenticado(String email, Long idUsuario) {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getName()).thenReturn(email);

        SecurityContext ctx = mock(SecurityContext.class);
        when(ctx.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(ctx);

        Usuario usuario = new Usuario();
        usuario.setEmail(email);
        try {
            java.lang.reflect.Field idField = Usuario.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(usuario, idUsuario);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("No se pudo asignar id al Usuario de prueba", e);
        }
        when(usuarioRepository.findByEmail(email)).thenReturn(Optional.of(usuario));
    }

    /**
     * Configura JdbcTemplate para simular la respuesta del SP.
     * Usa reflexión para invocar el callback sin cast genérico problemático.
     */
    private void mockJdbcSp(String oResultado, int oStockNuevo) throws Exception {
        CallableStatement cs = mock(CallableStatement.class);
        when(cs.getString(10)).thenReturn(oResultado);
        when(cs.getInt(11)).thenReturn(oStockNuevo);

        doAnswer(invocation -> {
            Object callback = invocation.getArgument(1);
            try {
                callback.getClass()
                        .getMethod("doInCallableStatement", CallableStatement.class)
                        .invoke(callback, cs);
            } catch (java.lang.reflect.InvocationTargetException e) {
                if (e.getCause() instanceof RuntimeException re) throw re;
                throw new RuntimeException(e.getCause());
            } catch (ReflectiveOperationException e) {
                throw new RuntimeException(e);
            }
            return null;
        }).when(jdbcTemplate).execute(anyString(),
                any(org.springframework.jdbc.core.CallableStatementCallback.class));
    }

    /** Request de SALIDA reutilizable. */
    private StockMovimientoRequest requestSalida(Long idProducto, int cantidad) {
        StockMovimientoRequest req = new StockMovimientoRequest();
        req.setIdProducto(idProducto);
        req.setIdCliente(1L);
        req.setTipoMovimiento("SALIDA");
        req.setCantidad(cantidad);
        req.setPrecioUnitario(new BigDecimal("59.99"));
        req.setReferencia("VTA-TEST-001");
        return req;
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 1 — Venta exitosa
    // ─────────────────────────────────────────────────────────────────

    @Test
    void registrarMovimiento_ventaExitosa_devuelveOkYStockNuevo() throws Exception {
        mockUsuarioAutenticado("cajero@levelupnexus.es", 3L);
        mockJdbcSp("OK: 5 → 4", 4);

        StockMovimientoResponse resultado =
                stockService.registrarMovimiento(requestSalida(1L, 1));

        assertNotNull(resultado);
        assertTrue(resultado.getResultado().startsWith("OK"));
        assertEquals(4, resultado.getStockNuevo());
    }

    @Test
    void registrarMovimiento_entradaProveedor_devuelveOk() throws Exception {
        mockUsuarioAutenticado("gestor@levelupnexus.es", 2L);
        mockJdbcSp("OK: 10 → 20", 20);

        StockMovimientoRequest req = new StockMovimientoRequest();
        req.setIdProducto(2L);
        req.setIdProveedor(1L);
        req.setTipoMovimiento("ENTRADA");
        req.setCantidad(10);
        req.setPrecioUnitario(new BigDecimal("29.99"));
        req.setReferencia("ALB-TEST-001");

        StockMovimientoResponse resultado = stockService.registrarMovimiento(req);

        assertTrue(resultado.getResultado().startsWith("OK"));
        assertEquals(20, resultado.getStockNuevo());
    }

    @Test
    void registrarMovimiento_ajusteManual_devuelveOk() throws Exception {
        mockUsuarioAutenticado("gestor@levelupnexus.es", 2L);
        mockJdbcSp("OK: 8 → 10", 10);

        StockMovimientoRequest req = new StockMovimientoRequest();
        req.setIdProducto(3L);
        req.setTipoMovimiento("AJUSTE");
        req.setCantidad(2);
        req.setNotas("Corrección tras recuento de inventario");

        StockMovimientoResponse resultado = stockService.registrarMovimiento(req);

        assertTrue(resultado.getResultado().startsWith("OK"));
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 2 — Stock insuficiente
    // ─────────────────────────────────────────────────────────────────

    @Test
    void registrarMovimiento_stockInsuficiente_lanza409() throws Exception {
        mockUsuarioAutenticado("cajero@levelupnexus.es", 3L);
        mockJdbcSp("ERROR: Stock insuficiente. Disponible: 0", 0);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> stockService.registrarMovimiento(requestSalida(1L, 5)));

        assertEquals(409, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("Stock insuficiente"));
    }

    @Test
    void registrarMovimiento_articuloRetroAgotado_lanza409ConMensajeRetro() throws Exception {
        mockUsuarioAutenticado("cajero@levelupnexus.es", 3L);
        mockJdbcSp("ERROR: Stock insuficiente. Disponible: 0 | Pieza RETRO única: ya fue vendida.", 0);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> stockService.registrarMovimiento(requestSalida(99L, 1)));

        assertEquals(409, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("RETRO"));
    }

    @Test
    void registrarMovimiento_productoNoEncontrado_lanza409() throws Exception {
        mockUsuarioAutenticado("cajero@levelupnexus.es", 3L);
        mockJdbcSp("ERROR: Producto no encontrado id=999", -1);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> stockService.registrarMovimiento(requestSalida(999L, 1)));

        assertEquals(409, ex.getStatusCode().value());
    }

    @Test
    void registrarMovimiento_sinAutenticacion_lanza401() {
        SecurityContext ctx = mock(SecurityContext.class);
        when(ctx.getAuthentication()).thenReturn(null);
        SecurityContextHolder.setContext(ctx);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> stockService.registrarMovimiento(requestSalida(1L, 1)));

        assertEquals(401, ex.getStatusCode().value());
        verifyNoInteractions(jdbcTemplate);
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 3 — Concurrencia
    //
    // El SP PostgreSQL usa SELECT FOR UPDATE: garantiza que solo una
    // transacción simultánea tiene éxito sobre el mismo artículo RETRO.
    //
    // En el test simulamos ese comportamiento sin hilos reales:
    //   - Primera petición  → el SP responde OK   (primera transacción gana)
    //   - Segunda petición  → el SP responde ERROR (segunda transacción pierde)
    //
    // Verificamos que el servicio maneja correctamente ambas respuestas:
    //   - OK    → devuelve el mapa con stockNuevo
    //   - ERROR → lanza ResponseStatusException 409
    // ─────────────────────────────────────────────────────────────────

    @Test
    void registrarMovimiento_concurrencia_primeraVentaExitosaSegundaFalla()
            throws Exception {

        // ── Primera petición: el SP dice OK (gana la carrera) ─────────
        mockUsuarioAutenticado("cajero@levelupnexus.es", 3L);
        mockJdbcSp("OK: 1 → 0", 0);

        StockMovimientoResponse primeraRespuesta =
                stockService.registrarMovimiento(requestSalida(99L, 1));

        assertTrue(primeraRespuesta.getResultado().startsWith("OK"),
                "La primera petición debe tener éxito");
        assertEquals(0, primeraRespuesta.getStockNuevo(),
                "Tras la venta el stock del RETRO debe ser 0");

        // ── Segunda petición: el SP dice ERROR (pierde la carrera) ────
        // Necesitamos resetear el mock para configurar una nueva respuesta
        reset(jdbcTemplate);
        mockJdbcSp("ERROR: Stock insuficiente. Disponible: 0 | Pieza RETRO única: ya fue vendida.", 0);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> stockService.registrarMovimiento(requestSalida(99L, 1)),
                "La segunda petición debe fallar con 409");

        assertEquals(409, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("RETRO"));
    }
}