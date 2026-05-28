package com.nexus.service;

import com.nexus.dto.StockMovimientoRequest;
import com.nexus.model.Cliente;
import com.nexus.model.Usuario;
import com.nexus.repository.ClienteRepository;
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
 *   3. Validación de cliente inválido (nuevo — lanza 422)
 *   4. Concurrencia: el SP garantiza ACID — simulamos que solo una
 *      de dos peticiones simultáneas tiene éxito
 */
@ExtendWith(MockitoExtension.class)
class StockServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private ClienteRepository clienteRepository;

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
     * Simula un cliente activo con el id dado en el clienteRepository.
     */
    private void mockClienteActivo(Long idCliente) {
        Cliente cliente = new Cliente();
        cliente.setActivo(true);
        when(clienteRepository.findById(idCliente)).thenReturn(Optional.of(cliente));
    }

    /**
     * Configura JdbcTemplate para simular la respuesta del SP.
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

    /** Request de SALIDA reutilizable con idCliente=1L. */
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
        mockClienteActivo(1L);
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
        // ENTRADA no tiene idCliente — no se consulta clienteRepository
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
        // Verificar que no se consultó clienteRepository (ENTRADA no tiene cliente)
        verifyNoInteractions(clienteRepository);
    }

    @Test
    void registrarMovimiento_ajusteManual_devuelveOk() throws Exception {
        // AJUSTE tampoco tiene idCliente
        mockUsuarioAutenticado("gestor@levelupnexus.es", 2L);
        mockJdbcSp("OK: 8 → 10", 10);

        StockMovimientoRequest req = new StockMovimientoRequest();
        req.setIdProducto(3L);
        req.setTipoMovimiento("AJUSTE");
        req.setCantidad(2);
        req.setNotas("Corrección tras recuento de inventario");

        StockMovimientoResponse resultado = stockService.registrarMovimiento(req);

        assertTrue(resultado.getResultado().startsWith("OK"));
        verifyNoInteractions(clienteRepository);
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 2 — Stock insuficiente / errores del SP
    // ─────────────────────────────────────────────────────────────────

    @Test
    void registrarMovimiento_stockInsuficiente_lanza409() throws Exception {
        mockClienteActivo(1L);
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
        mockClienteActivo(1L);
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
        mockClienteActivo(1L);
        mockUsuarioAutenticado("cajero@levelupnexus.es", 3L);
        mockJdbcSp("ERROR: Producto no encontrado id=999", -1);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> stockService.registrarMovimiento(requestSalida(999L, 1)));

        assertEquals(409, ex.getStatusCode().value());
    }

    @Test
    void registrarMovimiento_sinAutenticacion_lanza401() {
        // idCliente=1L está en requestSalida, pero la validación de cliente
        // ocurre ANTES de getUsuarioAutenticadoId, así que necesitamos
        // mockear el cliente para que no falle ahí y llegue al check de auth.
        mockClienteActivo(1L);

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
    // TEST 3 — Validación de cliente inválido (nuevo)
    // ─────────────────────────────────────────────────────────────────

    @Test
    void registrarMovimiento_clienteNoExistente_lanza422() {
        // clienteRepository devuelve vacío → 422 antes de llegar al SP
        when(clienteRepository.findById(1L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> stockService.registrarMovimiento(requestSalida(1L, 1)));

        assertEquals(422, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("ID no existente o inactivo"));
        verifyNoInteractions(jdbcTemplate);
        verifyNoInteractions(usuarioRepository);
    }

    @Test
    void registrarMovimiento_clienteInactivo_lanza422() {
        Cliente clienteInactivo = new Cliente();
        clienteInactivo.setActivo(false);
        when(clienteRepository.findById(1L)).thenReturn(Optional.of(clienteInactivo));

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> stockService.registrarMovimiento(requestSalida(1L, 1)));

        assertEquals(422, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("ID no existente o inactivo"));
        verifyNoInteractions(jdbcTemplate);
        verifyNoInteractions(usuarioRepository);
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 4 — Concurrencia
    // ─────────────────────────────────────────────────────────────────

    @Test
    void registrarMovimiento_concurrencia_primeraVentaExitosaSegundaFalla()
            throws Exception {

        // ── Primera petición: el SP dice OK (gana la carrera) ─────────
        mockClienteActivo(1L);
        mockUsuarioAutenticado("cajero@levelupnexus.es", 3L);
        mockJdbcSp("OK: 1 → 0", 0);

        StockMovimientoResponse primeraRespuesta =
                stockService.registrarMovimiento(requestSalida(99L, 1));

        assertTrue(primeraRespuesta.getResultado().startsWith("OK"),
                "La primera petición debe tener éxito");
        assertEquals(0, primeraRespuesta.getStockNuevo(),
                "Tras la venta el stock del RETRO debe ser 0");

        // ── Segunda petición: el SP dice ERROR (pierde la carrera) ────
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