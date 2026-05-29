package com.nexus.service;

import com.nexus.audit.AuditService;
import com.nexus.dto.UsuarioDTO;
import com.nexus.model.Rol;
import com.nexus.model.Usuario;
import com.nexus.repository.RolRepository;
import com.nexus.repository.UsuarioRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository     rolRepository;
    private final AuditService      auditService;

    public UsuarioService(UsuarioRepository usuarioRepository,
                          RolRepository rolRepository,
                          AuditService auditService) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository     = rolRepository;
        this.auditService      = auditService;
    }

    private Long getUsuarioActualId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return usuarioRepository.findByEmail(email)
                .map(Usuario::getId)
                .orElseThrow(() -> new RuntimeException("Usuario actual no encontrado"));
    }

    public Page<UsuarioDTO> listar(String buscar, Pageable pageable) {
        Page<Usuario> page;
        if (buscar != null && !buscar.isBlank()) {
            page = usuarioRepository.findByEmailContainingIgnoreCaseOrUsernameContainingIgnoreCaseOrNombreCompletoContainingIgnoreCase(
                    buscar, buscar, buscar, pageable);
        } else {
            page = usuarioRepository.findAll(pageable);
        }
        return page.map(this::toDTO);
    }

    public UsuarioDTO buscarPorId(Long id) {
        return toDTO(usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + id)));
    }

    public void activar(Long id) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + id));
        u.setActive(true);
        usuarioRepository.save(u);
        auditService.log("USUARIO", "ACTIVATE", id,
                "Cuenta activada: " + u.getEmail());
    }

    public void desactivar(Long id) {
        if (id.equals(getUsuarioActualId())) {
            throw new RuntimeException("No puedes desactivarte a ti mismo");
        }
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + id));
        u.setActive(false);
        usuarioRepository.save(u);
        auditService.log("USUARIO", "DEACTIVATE", id,
                "Cuenta desactivada: " + u.getEmail());
    }

    public UsuarioDTO asignarRol(Long id, String nombreRol) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + id));
        Rol rol = rolRepository.findByNombre(nombreRol)
                .orElseThrow(() -> new RuntimeException("Rol no encontrado: " + nombreRol));
        u.getRoles().add(rol);
        UsuarioDTO result = toDTO(usuarioRepository.save(u));
        auditService.log("USUARIO", "ROLE_ASSIGN", id,
                "Rol asignado: " + nombreRol + " → " + u.getEmail());
        return result;
    }

    public UsuarioDTO quitarRol(Long id, String nombreRol) {
        if (id.equals(getUsuarioActualId()) && "ADMIN".equals(nombreRol)) {
            throw new RuntimeException("No puedes quitarte el rol ADMIN a ti mismo");
        }
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + id));
        u.getRoles().removeIf(r -> r.getNombre().equals(nombreRol));
        UsuarioDTO result = toDTO(usuarioRepository.save(u));
        auditService.log("USUARIO", "ROLE_REMOVE", id,
                "Rol retirado: " + nombreRol + " → " + u.getEmail());
        return result;
    }

    private UsuarioDTO toDTO(Usuario u) {
        UsuarioDTO dto = new UsuarioDTO();
        dto.setId(u.getId());
        dto.setEmail(u.getEmail());
        dto.setUsername(u.getUsername());
        dto.setNombreCompleto(u.getNombreCompleto());
        dto.setIsActive(u.isActive());
        dto.setIsVerified(u.isVerified());
        dto.setRoles(u.getRoles().stream().map(Rol::getNombre).collect(Collectors.toSet()));
        return dto;
    }
}
