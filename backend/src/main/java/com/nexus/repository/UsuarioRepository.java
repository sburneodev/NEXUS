package com.nexus.repository;

import com.nexus.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    // Para el login (CustomUserDetailsService busca por email)
    Optional<Usuario> findByEmail(String email);

    // Para el login por username (usado por JwtUtil y AuthService)
    Optional<Usuario> findByUsername(String username);

    // Comprobaciones de unicidad en el registro (SEC-06)
    boolean existsByEmail(String email);
    
    boolean existsByUsername(String username);

    // Para verificar el email con el token UUID (SEC-08 - Parte de Sebastián)
    Optional<Usuario> findByVerifyToken(String verifyToken);
}