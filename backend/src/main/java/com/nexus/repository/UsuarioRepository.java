package com.nexus.repository;

import com.nexus.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    // Para el login (CustomUserDetailsService busca por email)
    Optional<Usuario> findByEmail(String email);

    // Para el login por username (usado por JwtUtil y AuthService)
    Optional<Usuario> findByUsername(String username);

    // Parte Sebastián SEC08
    
    // Comprobaciones de unicidad en el registro (SEC-06)
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
}