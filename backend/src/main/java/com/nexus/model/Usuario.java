package com.nexus.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Entidad JPA que mapea EXACTAMENTE la tabla 'usuarios' de PostgreSQL.
 *
 * Con ddl-auto=validate, Hibernate comprueba al arrancar que cada columna
 * de la tabla existe aquí como campo. Si falta una, la app no arranca.
 *
 * Usamos @Getter/@Setter en lugar de @Data para evitar que Lombok genere
 * un toString() que imprima password_hash en los logs (riesgo de seguridad).
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "usuarios")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(nullable = false, unique = true, length = 60)
    private String username;

    @Column(name = "nombre_completo", length = 150)
    private String nombreCompleto;

    // La columna en BD se llama password_hash; en Java la exponemos como password
    // para que Spring Security la encuentre sin configuración adicional
    @Column(name = "password_hash", nullable = false, length = 255)
    private String password;

    // true por defecto: la cuenta existe. false = desactivada por el admin
    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    // Parte Sebastián SEC08

    // Caducidad del token: 24 horas desde el registro
    @Column(name = "verify_expires")
    private OffsetDateTime verifyExpires;

    @Column(name = "last_login")
    private OffsetDateTime lastLogin;

    // Gestionado automáticamente por @PrePersist y @PreUpdate
    @Column(name = "creado_en", nullable = false, updatable = false)
    private OffsetDateTime creadoEn;

    @Column(name = "actualizado_en", nullable = false)
    private OffsetDateTime actualizadoEn;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "usuarios_roles",
            joinColumns        = @JoinColumn(name = "id_usuario"),
            inverseJoinColumns = @JoinColumn(name = "id_rol")
    )
    private Set<Rol> roles = new HashSet<>();

    // Rellena timestamps antes del primer INSERT
    @PrePersist
    protected void onCreate() {
        this.creadoEn      = OffsetDateTime.now();
        this.actualizadoEn = OffsetDateTime.now();
    }

    // Actualiza actualizadoEn en cada UPDATE
    @PreUpdate
    protected void onUpdate() {
        this.actualizadoEn = OffsetDateTime.now();
    }
}