package com.nexus.repository;

import com.nexus.model.Cliente;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {

    // ── Listados solo-activos (comportamiento heredado) ───────────────
    Page<Cliente> findByActivoTrue(Pageable pageable);
    Page<Cliente> findByNombreContainingIgnoreCaseAndActivoTrue(String nombre, Pageable pageable);

    // ── Listados filtrados por estado activo/inactivo ─────────────────
    Page<Cliente> findByActivo(boolean activo, Pageable pageable);
    Page<Cliente> findByNombreContainingIgnoreCaseAndActivo(String nombre, boolean activo, Pageable pageable);

    // ── Búsqueda por nombre sin filtro de activo (para vista "Todos") ─
    Page<Cliente> findByNombreContainingIgnoreCase(String nombre, Pageable pageable);

    // ── Buscar por email para comprobar duplicados ────────────────────
    Optional<Cliente> findByEmail(String email);
}