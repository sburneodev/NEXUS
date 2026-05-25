package com.nexus.controller;

import com.nexus.dto.StockMovimientoRequest;
import com.nexus.service.StockService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * StockController — CRUD-06
 *
 * Expone el endpoint para registrar movimientos de stock.
 * La lógica ACID vive en el SP de PostgreSQL, no en Java.
 *
 * POST /api/stock/movimiento
 */
@RestController
@RequestMapping("/stock")
public class StockController {

    private final StockService stockService;

    public StockController(StockService stockService) {
        this.stockService = stockService;
    }

    /**
     * POST /api/stock/movimiento
     *
     * Body JSON para una ENTRADA (reposición):
     * {
     *   "idProducto":    1,
     *   "idProveedor":   3,
     *   "tipoMovimiento":"ENTRADA",
     *   "cantidad":      10,
     *   "precioUnitario":29.99,
     *   "referencia":    "ALB-2026-001"
     * }
     *
     * Body JSON para una SALIDA (venta):
     * {
     *   "idProducto":    1,
     *   "idCliente":     5,
     *   "tipoMovimiento":"SALIDA",
     *   "cantidad":      1,
     *   "precioUnitario":59.99,
     *   "referencia":    "VTA-2026-001"
     * }
     *
     * Body JSON para un AJUSTE (corrección manual):
     * {
     *   "idProducto":    1,
     *   "tipoMovimiento":"AJUSTE",
     *   "cantidad":      2,
     *   "notas":         "Corrección tras recuento de inventario"
     * }
     *
     * Respuesta exitosa (200):
     * { "resultado": "OK: 5 → 4", "stockNuevo": 4 }
     *
     * Respuesta de error (409):
     * { "mensaje": "ERROR: Stock insuficiente. Disponible: 0" }
     */
    @PostMapping("/movimiento")
    @PreAuthorize("hasAnyAuthority('CAJERO','GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<Map<String, Object>> registrarMovimiento(
            @Valid @RequestBody StockMovimientoRequest request) {

        Map<String, Object> resultado = stockService.registrarMovimiento(request);
        return ResponseEntity.ok(resultado);
    }
}