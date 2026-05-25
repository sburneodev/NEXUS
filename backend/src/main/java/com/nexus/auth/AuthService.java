package com.nexus.auth;

import com.nexus.auth.dto.AuthResponse;
import com.nexus.auth.dto.RegisterRequest;
import com.nexus.email.EmailService;
import com.nexus.model.Usuario;
import com.nexus.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * AuthService — Lógica de negocio de autenticación.
 *
 * SEC-06: registro de nuevos usuarios.
 * SEC-05/SEC-08 los implementa Sebastián en este mismo archivo
 * (añadirá los métodos login() y verifyEmail()).
 */
@Service
public class AuthService {

    // Logger manual — sustituye a @Slf4j de Lombok
        private static final Logger log = LoggerFactory.getLogger(AuthService.class);

        private final UsuarioRepository usuarioRepository;
        private final PasswordEncoder   passwordEncoder;
        private final EmailService      emailService;

    // Constructor manual — sustituye a @RequiredArgsConstructor de Lombok
        public AuthService(UsuarioRepository usuarioRepository,
                        PasswordEncoder passwordEncoder,
                        EmailService emailService) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder   = passwordEncoder;
        this.emailService      = emailService;
        }

    // ══════════════════════════════════════════════════════════════════
    // SEC-06 — POST /auth/register
    // ══════════════════════════════════════════════════════════════════

        /**
     * Registra un nuevo usuario en el sistema.
     *
     * Flujo completo:
     *  1. Validar unicidad de email y username
     *  2. Hashear contraseña con BCrypt (cost=12)
     *  3. Generar UUID de verificación + expiración 24h
     *  4. Guardar usuario con verified=false
     *  5. Enviar email HTML de activación (SEC-07)
     *  6. Devolver 201 con mensaje de éxito
     *
     * @param request DTO validado por @Valid en el controlador
     * @return AuthResponse con mensaje de confirmación
     * @throws ResponseStatusException 409 si email o username ya existen
     */
        @Transactional
        public AuthResponse register(RegisterRequest request) {

        // ── 1. Unicidad del email ─────────────────────────────────────
        if (usuarioRepository.existsByEmail(request.getEmail())) {
                log.warn("[AUTH][REGISTER] Email duplicado: {}", request.getEmail());
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "El email '" + request.getEmail() + "' ya está registrado."
                );
        }

        // ── 2. Unicidad del username ──────────────────────────────────
        if (usuarioRepository.existsByUsername(request.getUsername())) {
                log.warn("[AUTH][REGISTER] Username duplicado: {}", request.getUsername());
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "El nombre de usuario '" + request.getUsername() + "' ya está en uso."
                );
        }

        // ── 3. Hash BCrypt de la contraseña ───────────────────────────
        String hashedPassword = passwordEncoder.encode(request.getPassword());

        // ── 4. Token UUID de 36 chars para verificar el email ─────────
        String verifyToken = UUID.randomUUID().toString();
        OffsetDateTime verifyExpires = OffsetDateTime.now().plusHours(24);

        // ── 5. Construir la entidad ───────────────────────────────────
        Usuario nuevoUsuario = new Usuario();
        nuevoUsuario.setEmail(request.getEmail());
        nuevoUsuario.setUsername(request.getUsername());
        nuevoUsuario.setPassword(hashedPassword);
        nuevoUsuario.setNombreCompleto(
                request.getNombreCompleto() != null
                        ? request.getNombreCompleto().trim()
                        : ""
        );
        nuevoUsuario.setActive(true);
        nuevoUsuario.setVerified(false);
        nuevoUsuario.setVerifyToken(verifyToken);
        nuevoUsuario.setVerifyExpires(verifyExpires);

        // ── 6. Persistir en PostgreSQL ────────────────────────────────
        Usuario guardado = usuarioRepository.save(nuevoUsuario);
        log.info("[AUTH][REGISTER] Usuario creado id={} username={}",
                guardado.getId(), guardado.getUsername());

        // ── 7. Enviar email HTML de verificación (SEC-07) ────────────
        emailService.sendVerificationEmail(
                guardado.getEmail(),
                guardado.getUsername(),
                verifyToken
        );

        return AuthResponse.ofMessage(
                "Registro exitoso. Hemos enviado un enlace de activación a " + guardado.getEmail()
        );
}

    // ══════════════════════════════════════════════════════════════════
    // Sebastián añadirá aquí los métodos login() y verifyEmail()
    // SEC-05 y SEC-08 respectivamente. No tocar nada de lo de arriba.
    // ══════════════════════════════════════════════════════════════════
}