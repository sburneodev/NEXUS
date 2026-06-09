package com.nexus.controller;

import com.nexus.dto.ClienteDTO;
import com.nexus.service.ClienteService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/clientes")
public class ClienteController {

    private final ClienteService clienteService;

    public ClienteController(ClienteService clienteService) {
        this.clienteService = clienteService;
    }

    // GET /api/clientes?buscar=nombre&activo=true|false&page=0&size=20
    // activo omitido → devuelve todos (activos e inactivos)
    @GetMapping
    @PreAuthorize("hasAnyAuthority('CAJERO','GESTOR_INVENTARIO','ADMIN','MARKETING_ANALYST','CONTABLE')")
    public ResponseEntity<Page<ClienteDTO>> listar(
            @RequestParam(required = false) String buscar,
            @RequestParam(required = false) Boolean activo,
            Pageable pageable) {
        return ResponseEntity.ok(clienteService.listar(buscar, activo, pageable));
    }

    // GET /api/clientes/{id}
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('CAJERO','GESTOR_INVENTARIO','ADMIN','MARKETING_ANALYST','CONTABLE')")
    public ResponseEntity<ClienteDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(clienteService.buscarPorId(id));
    }

    // POST /api/clientes
    @PostMapping
    @PreAuthorize("hasAnyAuthority('CAJERO','GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<ClienteDTO> crear(@Valid @RequestBody ClienteDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clienteService.crear(dto));
    }

    // PUT /api/clientes/{id}
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('CAJERO','GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<ClienteDTO> editar(
            @PathVariable Long id,
            @Valid @RequestBody ClienteDTO dto) {
        return ResponseEntity.ok(clienteService.editar(id, dto));
    }

    // PATCH /api/clientes/{id}/puntos?cantidad=50
    // Suma o resta puntos de fidelidad sin tener que enviar todos los datos del cliente
    @PatchMapping("/{id}/puntos")
    @PreAuthorize("hasAnyAuthority('CAJERO','GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<ClienteDTO> sumarPuntos(
            @PathVariable Long id,
            @RequestParam int cantidad) {
        return ResponseEntity.ok(clienteService.sumarPuntos(id, cantidad));
    }

    // DELETE /api/clientes/{id}
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('GESTOR_INVENTARIO','ADMIN')")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        clienteService.softDelete(id);
        return ResponseEntity.noContent().build();
    }
}
