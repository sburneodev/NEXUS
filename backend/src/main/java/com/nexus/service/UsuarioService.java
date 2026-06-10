package com.nexus.service;

import com.nexus.audit.AuditService;
import com.nexus.dto.InvitarUsuarioRequest;
import com.nexus.dto.UsuarioDTO;
import com.nexus.model.Rol;
import com.nexus.model.Usuario;
import com.nexus.repository.RolRepository;
import com.nexus.repository.UsuarioRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.stream.Collectors;

@Service
public class UsuarioService {

    private static final String ENTIDAD       = "USUARIO";
    private static final String NOT_FOUND_MSG = "Usuario no encontrado: ";
    private static final String TEMP_PASSWORD = System.getenv().getOrDefault("TEMP_PASSWORD", "NEXUS2026!");

    private final UsuarioRepository usuarioRepository;
    private final RolRepository     rolRepository;
    private final AuditService      auditService;
    private final PasswordEncoder   passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository,
                          RolRepository rolRepository,
                          AuditService auditService,
                          PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository     = rolRepository;
        this.auditService      = auditService;
        this.passwordEncoder   = passwordEncoder;
    }

    private Long getUsuarioActualId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario actual no encontrado");
        }
        String email = auth.getName();
        return usuarioRepository.findByEmail(email)
                .map(Usuario::getId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Usuario actual no encontrado"));
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
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, NOT_FOUND_MSG + id)));
    }

    public void activar(Long id) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, NOT_FOUND_MSG + id));
        u.setActive(true);
        usuarioRepository.save(u);
        auditService.log(ENTIDAD, "ACTIVATE", id, "Cuenta activada: " + u.getEmail());
    }

    public void desactivar(Long id) {
        if (id.equals(getUsuarioActualId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "No puedes desactivarte a ti mismo");
        }
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, NOT_FOUND_MSG + id));
        u.setActive(false);
        usuarioRepository.save(u);
        auditService.log(ENTIDAD, "DEACTIVATE", id, "Cuenta desactivada: " + u.getEmail());
    }

    public UsuarioDTO asignarRol(Long id, String nombreRol) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, NOT_FOUND_MSG + id));
        Rol rol = rolRepository.findByNombre(nombreRol)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Rol no encontrado: " + nombreRol));
        u.getRoles().add(rol);
        UsuarioDTO result = toDTO(usuarioRepository.save(u));
        auditService.log(ENTIDAD, "ROLE_ASSIGN", id,
                "Rol asignado: " + nombreRol + " → " + u.getEmail());
        return result;
    }

    public UsuarioDTO quitarRol(Long id, String nombreRol) {
        if (id.equals(getUsuarioActualId()) && "ADMIN".equals(nombreRol)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "No puedes quitarte el rol ADMIN a ti mismo");
        }
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, NOT_FOUND_MSG + id));
        u.getRoles().removeIf(r -> r.getNombre().equals(nombreRol));
        UsuarioDTO result = toDTO(usuarioRepository.save(u));
        auditService.log(ENTIDAD, "ROLE_REMOVE", id,
                "Rol retirado: " + nombreRol + " → " + u.getEmail());
        return result;
    }

    public UsuarioDTO invitar(InvitarUsuarioRequest req) {
        if (usuarioRepository.existsByEmail(req.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El email ya está registrado: " + req.getEmail());
        }
        if (usuarioRepository.existsByUsername(req.getUsername())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El username ya está en uso: " + req.getUsername());
        }

        Usuario u = new Usuario();
        u.setEmail(req.getEmail());
        u.setUsername(req.getUsername());
        // Nombre completo: usar el proporcionado o el username como fallback
        String nombre = (req.getNombreCompleto() != null && !req.getNombreCompleto().isBlank())
                ? req.getNombreCompleto()
                : req.getUsername();
        u.setNombreCompleto(nombre);
        u.setPassword(passwordEncoder.encode(TEMP_PASSWORD));
        u.setActive(true);
        u.setVerified(true);
        u.setRoles(new HashSet<>());
        Usuario saved = usuarioRepository.save(u);

        if (req.getRol() != null && !req.getRol().isBlank()) {
            Rol rol = rolRepository.findByNombre(req.getRol())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.BAD_REQUEST, "Rol no encontrado: " + req.getRol()));
            saved.getRoles().add(rol);
            saved = usuarioRepository.save(saved);
        }

        auditService.log(ENTIDAD, "INSERT", saved.getId(),
                "Usuario creado por admin: " + saved.getEmail() + " — rol: " + req.getRol());

        return toDTO(saved);
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