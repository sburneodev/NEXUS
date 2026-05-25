package com.nexus.repository;

import com.nexus.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

// Al heredar de JpaRepository, Spring nos regala los métodos findAll, save, delete...
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    
    // Con solo poner este nombre, Spring Boot genera el "SELECT * FROM usuarios WHERE email = ?"
    Optional<Usuario> findByEmail(String email);
    Optional<Usuario> findByVerifyToken(String verifyToken);
}