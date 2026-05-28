package com.nexus.controller;

import com.nexus.dto.StockMovimientoRequest;
import com.nexus.dto.StockMovimientoResponse;
import com.nexus.service.StockService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * StockController
 *
 * CRUD-06 → POST /api/stock/movimiento
 * CRUD-07 → POST /api/stock/transaccion
 *
 * Ambos endpoints llaman al mismo StockService.registrarMovimiento()
 * que ejecuta sp_registrar_transaccion_stock con bloqueo ACID (FOR UPDATE).
 */
@RestController
@RequestMapping("/stock")
public class StockController {

    private final StockService stockService;

    public StockController(StockService stockService) {
        this.stockService = stockService;
    }

    // CRUD-06 — POST /api/stock/movimiento
    @PostMapping("/movimiento")
    @PreAuthorize("hasAnyAuthority('CAJERO','GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<StockMovimientoResponse> registrarMovimiento(
            @Valid @RequestBody StockMovimientoRequest request) {
        return ResponseEntity.ok(stockService.registrarMovimiento(request));
    }

    // CRUD-07 — POST /api/stock/transaccion
    @PostMapping("/transaccion")
    @PreAuthorize("hasAnyAuthority('CAJERO','GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<StockMovimientoResponse> registrarTransaccion(
            @Valid @RequestBody StockMovimientoRequest request) {
        return ResponseEntity.ok(stockService.registrarMovimiento(request));
    }
}