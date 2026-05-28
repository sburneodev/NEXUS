package com.nexus.service;

import com.nexus.dto.StockMovimientoRequest;
import com.nexus.dto.StockMovimientoResponse;
import com.nexus.repository.ClienteRepository;
import com.nexus.repository.ProveedorRepository;
import com.nexus.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.sql.CallableStatement;
import java.sql.Types;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
public class StockService {

    private static final Logger log = LoggerFactory.getLogger(StockService.class);

    private final JdbcTemplate        jdbcTemplate;
    private final UsuarioRepository   usuarioRepository;
    private final ClienteRepository   clienteRepository;
    private final ProveedorRepository proveedorRepository;

    public StockService(JdbcTemplate jdbcTemplate,
                        UsuarioRepository usuarioRepository,
                        ClienteRepository clienteRepository,
                        ProveedorRepository proveedorRepository) {
        this.jdbcTemplate        = jdbcTemplate;
        this.usuarioRepository   = usuarioRepository;
        this.clienteRepository   = clienteRepository;
        this.proveedorRepository = proveedorRepository;
    }

    public StockMovimientoResponse registrarMovimiento(StockMovimientoRequest request) {

        // ── Validación previa: cliente ────────────────────────────────
        if (request.getIdCliente() != null) {
            boolean existeYActivo = clienteRepository.findById(request.getIdCliente())
                    .map(c -> Boolean.TRUE.equals(c.getActivo()))
                    .orElse(false);
            if (!existeYActivo) {
                log.warn("[STOCK] id_cliente={} no existente o inactivo", request.getIdCliente());
                throw new ResponseStatusException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "ID de cliente no existente o inactivo. Comprueba que existe o habla con soporte."
                );
            }
        }

        // ── Validación previa: proveedor ──────────────────────────────
        if (request.getIdProveedor() != null) {
            boolean existeYActivo = proveedorRepository.findById(request.getIdProveedor())
                    .map(p -> Boolean.TRUE.equals(p.getActivo()))
                    .orElse(false);
            if (!existeYActivo) {
                log.warn("[STOCK] id_proveedor={} no existente o inactivo", request.getIdProveedor());
                throw new ResponseStatusException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "ID de proveedor no existente o inactivo. Comprueba que existe o habla con soporte."
                );
            }
        }

        Long idUsuario = getUsuarioAutenticadoId();

        String sql = "CALL sp_registrar_transaccion_stock(?,?,?,?,?,?,?,?,?,?,?)";

        final String[] oResultado  = new String[1];
        final int[]    oStockNuevo = new int[1];

        try {
            jdbcTemplate.execute(sql, (CallableStatement cs) -> {
                cs.setLong   (1, request.getIdProducto());
                cs.setLong   (2, idUsuario);

                if (request.getIdCliente() != null)
                    cs.setLong(3, request.getIdCliente());
                else
                    cs.setNull(3, Types.BIGINT);

                if (request.getIdProveedor() != null)
                    cs.setLong(4, request.getIdProveedor());
                else
                    cs.setNull(4, Types.BIGINT);

                cs.setString (5, request.getTipoMovimiento());
                cs.setInt    (6, request.getCantidad());

                if (request.getPrecioUnitario() != null)
                    cs.setBigDecimal(7, request.getPrecioUnitario());
                else
                    cs.setNull(7, Types.NUMERIC);

                cs.setString(8, request.getReferencia());
                cs.setString(9, request.getNotas());

                cs.registerOutParameter(10, Types.VARCHAR);
                cs.registerOutParameter(11, Types.INTEGER);

                cs.execute();

                oResultado[0]  = cs.getString(10);
                oStockNuevo[0] = cs.getInt(11);

                return null;
            });

        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (Exception e) {
            log.error("[STOCK] Error SP producto={} tipo={}: {}",
                    request.getIdProducto(), request.getTipoMovimiento(), e.getMessage());
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Error al procesar la transacción. Inténtalo de nuevo o contacta con soporte."
            );
        }

        String resultado  = oResultado[0];
        int    stockNuevo = oStockNuevo[0];

        log.info("[STOCK] SP resultado='{}' stockNuevo={} producto={} tipo={}",
                resultado, stockNuevo, request.getIdProducto(), request.getTipoMovimiento());

        if (resultado != null && resultado.startsWith("ERROR")) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, resultado);
        }

        String fechaStr      = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String uid           = UUID.randomUUID().toString().replace("-","").substring(0,6).toUpperCase();
        String albaranCodigo = "ALB-" + fechaStr + "-" + uid;
        String albaranFecha  = ZonedDateTime.now(ZoneId.of("Europe/Madrid"))
                                   .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);

        return new StockMovimientoResponse(resultado, stockNuevo, albaranCodigo, albaranFecha);
    }

    private Long getUsuarioAutenticadoId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no autenticado");
        }
        return usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Usuario no encontrado: " + auth.getName()))
                .getId();
    }
}