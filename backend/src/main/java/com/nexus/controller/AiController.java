package com.nexus.controller;

import com.nexus.ai.InformeStockService;
import com.nexus.ai.NL2SQLService;
import com.nexus.ai.RecompraService;
import com.nexus.ai.TasadorService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/ai")
public class AiController {

    private final TasadorService tasadorService;
    private final RecompraService recompraService;
    private final InformeStockService informeStockService;
    private final NL2SQLService nl2SQLService;

    public AiController(TasadorService tasadorService,
                        RecompraService recompraService,
                        InformeStockService informeStockService,
                        NL2SQLService nl2SQLService) {
        this.tasadorService      = tasadorService;
        this.recompraService     = recompraService;
        this.informeStockService = informeStockService;
        this.nl2SQLService       = nl2SQLService;
    }

    // AI-04 — POST /api/ai/tasar
    @PostMapping("/tasar")
    @PreAuthorize("hasAnyAuthority('CAJERO','GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<Map<String, Object>> tasar(
            @RequestBody Map<String, Object> atributos) {
        return ResponseEntity.ok(tasadorService.tasarArticulo(atributos));
    }

    // AI-05 — POST /api/ai/recompra
    @PostMapping("/recompra")
    @PreAuthorize("hasAnyAuthority('CAJERO','GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<Map<String, Object>> recompra(
            @RequestBody Map<String, String> body) {
        String descripcion = body.getOrDefault("descripcion", "");
        return ResponseEntity.ok(recompraService.analizarRecompra(descripcion));
    }

    // AI-06 — POST /api/ai/informe-stock
    @PostMapping("/informe-stock")
    @PreAuthorize("hasAnyAuthority('GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<Map<String, Object>> informeStock() {
        return ResponseEntity.ok(informeStockService.generarInforme());
    }

    // AI-07 — POST /api/nl2sql
    @PostMapping("/nl2sql")
    @PreAuthorize("hasAnyAuthority('MARKETING_ANALYST','ADMIN')")
    public ResponseEntity<Map<String, Object>> nl2sql(
            @RequestBody Map<String, String> body) {
        String pregunta = body.getOrDefault("pregunta", "");
        return ResponseEntity.ok(nl2SQLService.ejecutarConsulta(pregunta));
    }
}