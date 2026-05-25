package com.nexus.repository;

import com.nexus.model.Producto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ProductoRepository extends JpaRepository<Producto, Long> {

    Optional<Producto> findBySkuAndActivoTrue(String sku);

    Page<Producto> findByActivoTrue(Pageable pageable);

    Page<Producto> findByTipoProductoAndActivoTrue(String tipoProducto, Pageable pageable);

    @Query(value = """
        SELECT * FROM productos
        WHERE activo = true
        AND to_tsvector('spanish', nombre || ' ' || COALESCE(descripcion, ''))
            @@ plainto_tsquery('spanish', :query)
        """, nativeQuery = true)
    Page<Producto> buscarFullText(@Param("query") String query, Pageable pageable);
}