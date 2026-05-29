package com.nexus.controller;

import com.nexus.dto.AsignarRolRequest;
import com.nexus.dto.UsuarioDTO;
import com.nexus.service.UsuarioService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/usuarios")
@PreAuthorize("hasAuthority('ADMIN')")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping
    public ResponseEntity<Page<UsuarioDTO>> listar(
            @RequestParam(required = false) String buscar,
            Pageable pageable) {
        return ResponseEntity.ok(usuarioService.listar(buscar, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UsuarioDTO> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(usuarioService.buscarPorId(id));
    }

    @PutMapping("/{id}/activar")
    public ResponseEntity<Void> activar(@PathVariable Long id) {
        usuarioService.activar(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/desactivar")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        usuarioService.desactivar(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/roles")
    public ResponseEntity<UsuarioDTO> asignarRol(@PathVariable Long id,
                                                  @RequestBody AsignarRolRequest request) {
        return ResponseEntity.ok(usuarioService.asignarRol(id, request.getRol()));
    }

    @DeleteMapping("/{id}/roles")
    public ResponseEntity<UsuarioDTO> quitarRol(@PathVariable Long id,
                                                 @RequestBody AsignarRolRequest request) {
        return ResponseEntity.ok(usuarioService.quitarRol(id, request.getRol()));
    }
    @PutMapping("/{id}/rol")
    public ResponseEntity<UsuarioDTO> cambiarRol(@PathVariable Long id,
                                                  @RequestBody AsignarRolRequest request) {
        return ResponseEntity.ok(usuarioService.asignarRol(id, request.getRol()));
    }

}