package com.nexus.security;

import com.nexus.model.Usuario;
import com.nexus.repository.UsuarioRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    public CustomUserDetailsService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + email));

        // Normalizar prefijo ROLE_: "ROLE_ADMIN" → "ADMIN"
        // ── POR QUÉ TAMBIÉN AQUÍ (además de AuthService.login) ────────────
        // AuthService.login() normaliza al generar el JWT, pero este método
        // se llama en CADA REQUEST para reconstruir las authorities desde la BD.
        // Tener la normalización aquí también garantiza que:
        //   · Los tokens generados antes del despliegue del fix sigan funcionando.
        //   · Cualquier futura ruta que regenere tokens sin pasar por AuthService
        //     sea igualmente correcta.
        // Regla canónica del sistema: todos los nombres de rol en código Java
        // son SIN prefijo (ADMIN, CAJERO, GESTOR_INVENTARIO...).
        // El prefijo ROLE_ solo existe en la columna roles.nombre de la BD.
        // ──────────────────────────────────────────────────────────────────
        return new User(
                usuario.getEmail(),
                usuario.getPassword(),
                usuario.getRoles().stream()
                        .map(rol -> {
                            String nombre = rol.getNombre();
                            return new SimpleGrantedAuthority(
                                nombre.startsWith("ROLE_") ? nombre.substring(5) : nombre
                            );
                        })
                        .toList()
        );
    }
}