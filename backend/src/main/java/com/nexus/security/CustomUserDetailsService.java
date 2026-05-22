package com.nexus.security;

import com.nexus.model.Usuario;
import com.nexus.repository.UsuarioRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    // Inyección del repositorio a través del constructor
    public CustomUserDetailsService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // 1. Buscamos al usuario en nuestra base de datos (PostgreSQL)
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado con email: " + email));

        // 2. Convertimos nuestro Usuario (de base de datos) al UserDetails (que entiende Spring Security)
        return new User(
                usuario.getEmail(),
                usuario.getPassword(),
                usuario.getRoles().stream()
                        // Convertimos cada Rol en una Autoridad (Permiso) de Spring
                        .map(rol -> new SimpleGrantedAuthority(rol.getNombre()))
                        .collect(Collectors.toList())
        );
    }
}