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

    /**
     * Búsqueda por coincidencia parcial (ILIKE %...%) en nombre, SKU y descripción.
     * Sustituye a buscarFullText que usaba to_tsvector/plainto_tsquery
     * (solo coincidía palabras completas y fallaba con SKUs como STD-PS5-001).
     */
    @Query(value = """
        SELECT * FROM productos
        WHERE activo = true
          AND (
              nombre                    ILIKE CONCAT('%', :query, '%')
              OR sku                    ILIKE CONCAT('%', :query, '%')
              OR COALESCE(descripcion, '') ILIKE CONCAT('%', :query, '%')
          )
        """,
        countQuery = """
        SELECT COUNT(*) FROM productos
        WHERE activo = true
          AND (
              nombre                    ILIKE CONCAT('%', :query, '%')
              OR sku                    ILIKE CONCAT('%', :query, '%')
              OR COALESCE(descripcion, '') ILIKE CONCAT('%', :query, '%')
          )
        """,
        nativeQuery = true)
    Page<Producto> buscarContains(@Param("query") String query, Pageable pageable);

    /** Misma búsqueda parcial pero filtrada además por tipo_producto. */
    @Query(value = """
        SELECT * FROM productos
        WHERE activo = true
          AND tipo_producto = :tipo
          AND (
              nombre                    ILIKE CONCAT('%', :query, '%')
              OR sku                    ILIKE CONCAT('%', :query, '%')
              OR COALESCE(descripcion, '') ILIKE CONCAT('%', :query, '%')
          )
        """,
        countQuery = """
        SELECT COUNT(*) FROM productos
        WHERE activo = true
          AND tipo_producto = :tipo
          AND (
              nombre                    ILIKE CONCAT('%', :query, '%')
              OR sku                    ILIKE CONCAT('%', :query, '%')
              OR COALESCE(descripcion, '') ILIKE CONCAT('%', :query, '%')
          )
        """,
        nativeQuery = true)
    Page<Producto> buscarContainsPorTipo(
            @Param("query") String query,
            @Param("tipo")  String tipo,
            Pageable pageable);
}