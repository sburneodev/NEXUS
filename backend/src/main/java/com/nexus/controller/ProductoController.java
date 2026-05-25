package com.nexus.controller;

import com.nexus.dto.ProductoDTO;
import com.nexus.service.ProductoService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/productos")
public class ProductoController {

    private final ProductoService productoService;

    public ProductoController(ProductoService productoService) {
        this.productoService = productoService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('CAJERO','GESTOR_INVENTARIO','ADMIN','MARKETING_ANALYST','CONTABLE')")
    public ResponseEntity<Page<ProductoDTO>> listar(
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) String buscar,
            Pageable pageable) {

        if (buscar != null && !buscar.isBlank()) {
            return ResponseEntity.ok(productoService.buscar(buscar, pageable));
        }
        if (tipo != null && !tipo.isBlank()) {
            return ResponseEntity.ok(productoService.listarPorTipo(tipo, pageable));
        }
        return ResponseEntity.ok(productoService.listar(pageable));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<ProductoDTO> crear(@RequestBody ProductoDTO dto) {
        return ResponseEntity.ok(productoService.crear(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<ProductoDTO> editar(@PathVariable Long id, @RequestBody ProductoDTO dto) {
        return ResponseEntity.ok(productoService.editar(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        productoService.softDelete(id);
        return ResponseEntity.noContent().build();
    }
}