package com.nexus.controller;

import com.nexus.dto.ProveedorDTO;
import com.nexus.service.ProveedorService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/proveedores")
public class ProveedorController {

    private final ProveedorService proveedorService;

    public ProveedorController(ProveedorService proveedorService) {
        this.proveedorService = proveedorService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('CAJERO','GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<List<ProveedorDTO>> listar() {
        return ResponseEntity.ok(proveedorService.listar());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('CAJERO','GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<ProveedorDTO> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(proveedorService.buscarPorId(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<ProveedorDTO> crear(@RequestBody ProveedorDTO dto) {
        return ResponseEntity.ok(proveedorService.crear(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<ProveedorDTO> editar(@PathVariable Long id, @RequestBody ProveedorDTO dto) {
        return ResponseEntity.ok(proveedorService.editar(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        proveedorService.softDelete(id);
        return ResponseEntity.noContent().build();
    }
}