package com.nexus.service;

import com.nexus.dto.StockMovimientoRequest;
import com.nexus.dto.StockMovimientoResponse;
import com.nexus.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.sql.CallableStatement;
import java.sql.Types;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * StockService — CRUD-06
 *
 * Llama al Stored Procedure sp_registrar_transaccion_stock de PostgreSQL
 * usando JDBC puro (CallableStatement), no JPA.
 *
 * El SP es ACID y usa SELECT FOR UPDATE internamente, por lo que
 * garantiza que dos ventas simultáneas de un artículo RETRO (stock=1)
 * se procesan en serie y solo una tiene éxito.
 *
 * Firma del SP:
 *   IN:  p_id_producto, p_id_usuario, p_id_cliente, p_id_proveedor,
 *        p_tipo_movimiento, p_cantidad, p_precio_unitario,
 *        p_referencia, p_notas
 *   OUT: o_resultado TEXT, o_stock_nuevo INT
 *
 * o_resultado empieza por "OK:" si tuvo éxito, o por "ERROR:" si falló.
 */
@Service
public class StockService {

    private static final Logger log = LoggerFactory.getLogger(StockService.class);

    private final JdbcTemplate       jdbcTemplate;
    private final UsuarioRepository  usuarioRepository;

    public StockService(JdbcTemplate jdbcTemplate,
                        UsuarioRepository usuarioRepository) {
        this.jdbcTemplate      = jdbcTemplate;
        this.usuarioRepository = usuarioRepository;
    }

    /**
     * Registra un movimiento de stock llamando al SP via JDBC.
     * Tras el éxito del SP genera un albarán único para el frontend.
     *
     * @param request  DTO con los datos del movimiento
     * @return StockMovimientoResponse con resultado + stockNuevo + datos del albarán
     */
    public StockMovimientoResponse registrarMovimiento(StockMovimientoRequest request) {

        // Obtener el ID del usuario autenticado desde el JWT
        Long idUsuario = getUsuarioAutenticadoId();

        // Llamada al SP con JDBC usando execute() y un PreparedStatementCallback
        // IMPORTANTE: PostgreSQL distingue entre PROCEDURE y FUNCTION.
        // La sintaxis JDBC {call ...} intenta invocar como función (SELECT).
        // Para un CREATE PROCEDURE se debe usar CALL directamente,
        // o el driver JDBC lanza "is a procedure" BadSqlGrammarException.
        String sql = "CALL sp_registrar_transaccion_stock(?,?,?,?,?,?,?,?,?,?,?)";

        final String[] oResultado  = new String[1];
        final int[]    oStockNuevo = new int[1];

        jdbcTemplate.execute(sql, (CallableStatement cs) -> {

            // ── Parámetros IN (posiciones 1-9) ───────────────────────
            cs.setLong   (1, request.getIdProducto());
            cs.setLong   (2, idUsuario);

            // id_cliente: NULL si no es una SALIDA
            if (request.getIdCliente() != null) {
                cs.setLong(3, request.getIdCliente());
            } else {
                cs.setNull(3, Types.BIGINT);
            }

            // id_proveedor: NULL si no es una ENTRADA
            if (request.getIdProveedor() != null) {
                cs.setLong(4, request.getIdProveedor());
            } else {
                cs.setNull(4, Types.BIGINT);
            }

            cs.setString (5, request.getTipoMovimiento());
            cs.setInt    (6, request.getCantidad());

            // precio_unitario puede ser null
            if (request.getPrecioUnitario() != null) {
                cs.setBigDecimal(7, request.getPrecioUnitario());
            } else {
                cs.setNull(7, Types.NUMERIC);
            }

            // referencia y notas pueden ser null
            cs.setString(8, request.getReferencia());
            cs.setString(9, request.getNotas());

            // ── Parámetros OUT (posiciones 10-11) ────────────────────
            cs.registerOutParameter(10, Types.VARCHAR); // o_resultado
            cs.registerOutParameter(11, Types.INTEGER); // o_stock_nuevo

            cs.execute();

            // ── Recoger los valores OUT ───────────────────────────────
            oResultado[0]  = cs.getString(10);
            oStockNuevo[0] = cs.getInt(11);

            return null;
        });

        String resultado  = oResultado[0];
        int    stockNuevo = oStockNuevo[0];

        log.info("[STOCK] SP resultado='{}' stockNuevo={} producto={} tipo={}",
                resultado, stockNuevo,
                request.getIdProducto(), request.getTipoMovimiento());

        // El SP devuelve "OK: 5 → 4" o "ERROR: ..."
        // Si empieza por ERROR devolvemos 409 Conflict con el mensaje del SP
        if (resultado != null && resultado.startsWith("ERROR")) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, resultado);
        }

        // ── Generar albarán ──────────────────────────────────────────────
        // Formato: ALB-YYYYMMDD-XXXXXX  (6 hex chars en mayúsculas)
        // No persiste en BD — el frontend lo almacena para impresión.
        String fechaStr    = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String uid         = UUID.randomUUID().toString()
                                 .replace("-", "")
                                 .substring(0, 6)
                                 .toUpperCase();
        String albaranCodigo = "ALB-" + fechaStr + "-" + uid;

        String albaranFecha = ZonedDateTime.now(ZoneId.of("Europe/Madrid"))
                                 .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);

        log.info("[STOCK] Albarán generado: {} para producto={} tipo={}",
                albaranCodigo, request.getIdProducto(), request.getTipoMovimiento());

        return new StockMovimientoResponse(resultado, stockNuevo, albaranCodigo, albaranFecha);
    }

    /**
     * Obtiene el ID de base de datos del usuario autenticado.
     * El email viene del JWT (es el subject que generó JwtUtil).
     */
    private Long getUsuarioAutenticadoId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Usuario no autenticado");
        }

        String email = auth.getName(); // getName() devuelve el subject del JWT = email
        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Usuario no encontrado: " + email))
                .getId();
    }
}