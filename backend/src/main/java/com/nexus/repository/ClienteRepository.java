package com.nexus.repository;

import com.nexus.model.Cliente;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {

    // Listar solo activos con paginación
    Page<Cliente> findByActivoTrue(Pageable pageable);

    // Buscar por email para comprobar duplicados
    Optional<Cliente> findByEmail(String email);

    // Buscar por nombre (contiene, sin distinguir mayúsculas)
    Page<Cliente> findByNombreContainingIgnoreCaseAndActivoTrue(String nombre, Pageable pageable);
}