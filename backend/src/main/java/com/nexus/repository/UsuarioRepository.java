package com.nexus.repository;

import com.nexus.model.Usuario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

// Al heredar de JpaRepository, Spring nos regala los métodos findAll, save, delete...
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    // Con solo poner este nombre, Spring Boot genera el "SELECT * FROM usuarios WHERE email = ?"
    Optional<Usuario> findByEmail(String email);
    Optional<Usuario> findByVerifyToken(String verifyToken);

    /** Búsqueda paginada por email o username (insensible a mayúsculas) */
    @Query("SELECT u FROM Usuario u WHERE " +
           "LOWER(u.email)    LIKE LOWER(CONCAT('%', :buscar, '%')) OR " +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :buscar, '%'))")
    Page<Usuario> buscar(@Param("buscar") String buscar, Pageable pageable);
}