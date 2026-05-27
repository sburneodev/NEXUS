package com.nexus.model;

import jakarta.persistence.*;

/**
 * Entidad UbicacionAlmacen — tabla "ubicaciones_almacen"
 *
 * Representa una posición física en el almacén: pasillo + estantería + nivel.
 * Relación: un producto ocupa una ubicación (N:1).
 * AlmacenController hace JOIN directo con JDBC; esta entidad sirve
 * para el mapeo JPA en ProductoService (asignar ubicación al crear/editar).
 */
@Entity
@Table(name = "ubicaciones_almacen")
public class UbicacionAlmacen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String pasillo;

    @Column(nullable = false)
    private String estanteria;

    @Column(nullable = false)
    private Short nivel;

    // Getters
    public Long   getId()          { return id; }
    public String getPasillo()     { return pasillo; }
    public String getEstanteria()  { return estanteria; }
    public Short  getNivel()       { return nivel; }
}
