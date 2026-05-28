package com.nexus.controller;

import com.nexus.dto.AlbaranRangoResponse;
import com.nexus.dto.AlbaranRangoResponse.AlbaranItem;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;

/**
 * AlbaranRangoController — GET /api/stock/albaranes-rango
 *
 * Devuelve todos los movimientos de stock de un rango temporal
 * para generar un albarán consolidado en el frontend.
 *
 * Parámetros:
 *   desde  (LocalDate, requerido)
 *   hasta  (LocalDate, requerido)
 *   tipo   (String, opcional) — ENTRADA | SALIDA | null = todos
 *
 * Roles: ADMIN · GESTOR_INVENTARIO · CONTABLE
 */
@RestController
@RequestMapping("/stock")
public class AlbaranRangoController {

    private final JdbcTemplate jdbcTemplate;

    public AlbaranRangoController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/albaranes-rango")
    @PreAuthorize("hasAnyAuthority('ADMIN','GESTOR_INVENTARIO','CONTABLE')")
    public ResponseEntity<AlbaranRangoResponse> getAlbaranesRango(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(required = false) String tipo) {

        if (desde == null || hasta == null) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Los parametros 'desde' y 'hasta' son obligatorios (formato: YYYY-MM-DD)."
            );
        }
        if (desde.isAfter(hasta)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "La fecha de inicio no puede ser posterior a la fecha de fin."
            );
        }
        if (desde.plusDays(365).isBefore(hasta)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "El rango maximo permitido es de 365 dias."
            );
        }

        // Validar el parámetro tipo si se proporciona
        if (tipo != null && !tipo.equals("ENTRADA") && !tipo.equals("SALIDA")) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "El parametro 'tipo' debe ser ENTRADA o SALIDA."
            );
        }

        Date sqlDesde = Date.valueOf(desde);
        Date sqlHasta = Date.valueOf(hasta.plusDays(1));

        // Filtro de tipo dinámico: si tipo es null se devuelven ENTRADA y SALIDA,
        // si se especifica se filtra por ese valor concreto.
        String filtroTipo = tipo != null
            ? "AND tx.tipo_movimiento = '" + tipo + "'"
            : "AND tx.tipo_movimiento IN ('ENTRADA', 'SALIDA')";

        // Columnas reales según V1__init_schema.sql:
        //   clientes:    nombre, email, telefono  (sin direccion)
        //   proveedores: razon_social, cif, email, telefono, direccion
        String sql = """
            SELECT
                tx.id,
                tx.tipo_movimiento,
                tx.fecha AT TIME ZONE 'Europe/Madrid'   AS fecha,
                p.sku                                   AS producto_sku,
                p.nombre                                AS producto_nombre,
                p.descripcion                           AS producto_descripcion,
                p.tipo_producto                         AS producto_tipo,
                COALESCE(
                    CASE WHEN tx.tipo_movimiento = 'ENTRADA'
                         THEN prov.razon_social
                         ELSE cli.nombre
                    END,
                    'Sin entidad'
                )                                       AS entidad_nombre,
                CASE WHEN tx.tipo_movimiento = 'ENTRADA'
                     THEN prov.cif
                     ELSE NULL
                END                                     AS entidad_nif,
                CASE WHEN tx.tipo_movimiento = 'ENTRADA'
                     THEN prov.direccion
                     ELSE NULL
                END                                     AS entidad_direccion,
                CASE WHEN tx.tipo_movimiento = 'ENTRADA'
                     THEN prov.telefono
                     ELSE cli.telefono
                END                                     AS entidad_telefono,
                CASE WHEN tx.tipo_movimiento = 'ENTRADA'
                     THEN prov.email
                     ELSE cli.email
                END                                     AS entidad_email,
                tx.cantidad,
                tx.stock_antes,
                tx.stock_despues,
                CAST(tx.precio_unitario AS FLOAT)       AS precio_unitario,
                tx.referencia,
                tx.notas
            FROM transacciones_stock tx
            JOIN  productos    p    ON p.id    = tx.id_producto
            LEFT JOIN clientes    cli  ON cli.id  = tx.id_cliente
            LEFT JOIN proveedores prov ON prov.id = tx.id_proveedor
            WHERE tx.fecha >= ?
              AND tx.fecha <  ?
              \s""" + filtroTipo + """
            ORDER BY tx.fecha ASC
            """;

        List<AlbaranItem> items = jdbcTemplate.query(
            sql,
            (rs, rowNum) -> new AlbaranItem(
                rs.getLong("id"),
                rs.getString("tipo_movimiento"),
                rs.getString("fecha"),
                rs.getString("producto_sku"),
                rs.getString("producto_nombre"),
                rs.getString("producto_descripcion"),
                rs.getString("producto_tipo"),
                rs.getString("entidad_nombre"),
                rs.getString("entidad_nif"),
                rs.getString("entidad_direccion"),
                rs.getString("entidad_telefono"),
                rs.getString("entidad_email"),
                rs.getInt("cantidad"),
                rs.getInt("stock_antes"),
                rs.getInt("stock_despues"),
                rs.getObject("precio_unitario") != null
                    ? rs.getDouble("precio_unitario")
                    : null,
                rs.getString("referencia"),
                rs.getString("notas")
            ),
            sqlDesde,
            sqlHasta
        );

        return ResponseEntity.ok(
            new AlbaranRangoResponse(items, desde.toString(), hasta.toString(), tipo)
        );
    }
}