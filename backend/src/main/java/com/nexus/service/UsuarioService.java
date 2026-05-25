package com.nexus.service;

import com.nexus.dto.UsuarioDTO;
import com.nexus.model.Rol;
import com.nexus.model.Usuario;
import com.nexus.repository.RolRepository;
import com.nexus.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;

    public UsuarioService(UsuarioRepository usuarioRepository, RolRepository rolRepository) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
    }

    public List<UsuarioDTO> listar() {
        return usuarioRepository.findAll().stream().map(this::toDTO).toList();
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
    }

    public void desactivar(Long id) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + id));
        u.setActive(false);
        usuarioRepository.save(u);
    }

    public UsuarioDTO asignarRol(Long id, String nombreRol) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + id));
        Rol rol = rolRepository.findByNombre(nombreRol)
                .orElseThrow(() -> new RuntimeException("Rol no encontrado: " + nombreRol));
        u.getRoles().add(rol);
        return toDTO(usuarioRepository.save(u));
    }

    public UsuarioDTO quitarRol(Long id, String nombreRol) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + id));
        u.getRoles().removeIf(r -> r.getNombre().equals(nombreRol));
        return toDTO(usuarioRepository.save(u));
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