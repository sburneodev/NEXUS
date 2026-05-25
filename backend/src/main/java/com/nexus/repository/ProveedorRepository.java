package com.nexus.repository;

import com.nexus.model.Proveedor;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProveedorRepository extends JpaRepository<Proveedor, Long> {
}