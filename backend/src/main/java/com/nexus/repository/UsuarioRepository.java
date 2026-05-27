package com.nexus.repository;

import com.nexus.model.Usuario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmail(String email);
    Optional<Usuario> findByVerifyToken(String verifyToken);
    
    Page<Usuario> findByEmailContainingIgnoreCaseOrUsernameContainingIgnoreCaseOrNombreCompletoContainingIgnoreCase(
            String email, String username, String nombreCompleto, Pageable pageable);
}