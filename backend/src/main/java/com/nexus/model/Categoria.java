package com.nexus.model;

import jakarta.persistence.*;

/**
 * Entidad Categoria — tabla "categorias"
 *
 * Categorías de productos: Videojuegos, Retro, Figuras, Accesorios, etc.
 * Relación: un producto pertenece a una categoría (N:1).
 */
@Entity
@Table(name = "categorias")
public class Categoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String nombre;

    // Getters — sin setters para campos de solo lectura desde el servicio
    public Long getId()      { return id; }
    public String getNombre(){ return nombre; }
}
