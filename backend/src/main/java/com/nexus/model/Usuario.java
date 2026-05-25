package com.nexus.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;

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

    @Column(name = "password_hash", nullable = false, length = 255)
    private String password;

    // IMPORTANTE: el campo se llama 'active' (sin 'is')
    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    // Mismo razonamiento: campo 'verified'
    @Column(name = "is_verified", nullable = false)
    private boolean verified = false;

    @Column(name = "verify_token", length = 36)
    private String verifyToken;

    @Column(name = "verify_expires")
    private OffsetDateTime verifyExpires;

    @Column(name = "last_login")
    private OffsetDateTime lastLogin;

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

    // ── Constructor vacío obligatorio para JPA ────────────────────────
    public Usuario() {}

    // ── Getters y Setters ─────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getNombreCompleto() { return nombreCompleto; }
    public void setNombreCompleto(String nombreCompleto) { this.nombreCompleto = nombreCompleto; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }

    public String getVerifyToken() { return verifyToken; }
    public void setVerifyToken(String verifyToken) { this.verifyToken = verifyToken; }

    public OffsetDateTime getVerifyExpires() { return verifyExpires; }
    public void setVerifyExpires(OffsetDateTime verifyExpires) { this.verifyExpires = verifyExpires; }

    public OffsetDateTime getLastLogin() { return lastLogin; }
    public void setLastLogin(OffsetDateTime lastLogin) { this.lastLogin = lastLogin; }

    public OffsetDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(OffsetDateTime creadoEn) { this.creadoEn = creadoEn; }

    public OffsetDateTime getActualizadoEn() { return actualizadoEn; }
    public void setActualizadoEn(OffsetDateTime actualizadoEn) { this.actualizadoEn = actualizadoEn; }

    public Set<Rol> getRoles() { return roles; }
    public void setRoles(Set<Rol> roles) { this.roles = roles; }

    // ── Ciclo de vida JPA ─────────────────────────────────────────────
    @PrePersist
    protected void onCreate() {
        this.creadoEn      = OffsetDateTime.now();
        this.actualizadoEn = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.actualizadoEn = OffsetDateTime.now();
    }
}