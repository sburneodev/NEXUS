package com.nexus.auth;

import com.nexus.auth.dto.AuthResponse;
import com.nexus.auth.dto.RegisterRequest;
import com.nexus.dto.LoginRequest;
import com.nexus.email.EmailService;
import com.nexus.model.Usuario;
import com.nexus.repository.UsuarioRepository;
import com.nexus.security.JwtUtil;
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
 * SEC-06: registro de nuevos usuarios (Desirée).
 * SEC-05: login con JWT (integrado desde service.AuthService).
 * SEC-08: verificación de email (integrado desde service.AuthService).
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UsuarioRepository  usuarioRepository;
    private final PasswordEncoder    passwordEncoder;
    private final EmailService       emailService;
    private final JwtUtil            jwtUtil;

    public AuthService(UsuarioRepository usuarioRepository,
                       PasswordEncoder passwordEncoder,
                       EmailService emailService,
                       JwtUtil jwtUtil) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder   = passwordEncoder;
        this.emailService      = emailService;
        this.jwtUtil           = jwtUtil;
    }

    // ══════════════════════════════════════════════════════════════════
    // SEC-06 — POST /auth/register
    // ══════════════════════════════════════════════════════════════════

    @Transactional
    public AuthResponse register(RegisterRequest request) {

        if (usuarioRepository.existsByEmail(request.getEmail())) {
            log.warn("[AUTH][REGISTER] Email duplicado: {}", request.getEmail());
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El email '" + request.getEmail() + "' ya está registrado."
            );
        }

        if (usuarioRepository.existsByUsername(request.getUsername())) {
            log.warn("[AUTH][REGISTER] Username duplicado: {}", request.getUsername());
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El nombre de usuario '" + request.getUsername() + "' ya está en uso."
            );
        }

        String verifyToken   = UUID.randomUUID().toString();
        OffsetDateTime verifyExpires = OffsetDateTime.now().plusHours(24);

        Usuario nuevoUsuario = new Usuario();
        nuevoUsuario.setEmail(request.getEmail());
        nuevoUsuario.setUsername(request.getUsername());
        nuevoUsuario.setPassword(passwordEncoder.encode(request.getPassword()));
        nuevoUsuario.setNombreCompleto(
                request.getNombreCompleto() != null ? request.getNombreCompleto().trim() : "");
        nuevoUsuario.setActive(true);
        nuevoUsuario.setVerified(false);
        nuevoUsuario.setVerifyToken(verifyToken);
        nuevoUsuario.setVerifyExpires(verifyExpires);

        Usuario guardado = usuarioRepository.save(nuevoUsuario);
        log.info("[AUTH][REGISTER] Usuario creado id={} username={}", guardado.getId(), guardado.getUsername());

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
    // SEC-05 — POST /auth/login
    // ══════════════════════════════════════════════════════════════════

    public AuthResponse login(LoginRequest request) {

        Usuario usuario = usuarioRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Credenciales incorrectas"));

        if (!passwordEncoder.matches(request.getPassword(), usuario.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales incorrectas");
        }

        if (!usuario.isVerified()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cuenta no verificada. Revisa tu email.");
        }

        if (!usuario.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cuenta desactivada. Contacta con el administrador.");
        }

        // Normalizar roles: "ROLE_ADMIN" → "ADMIN"
        // Garantiza coherencia: BD (ROLE_ADMIN) → AuthService (ADMIN) → JWT → Frontend
        String roles = usuario.getRoles().stream()
                .map(r -> {
                    String n = r.getNombre();
                    return n.startsWith("ROLE_") ? n.substring(5) : n;
                })
                .reduce((a, b) -> a + "," + b)
                .orElse("");

        String token = jwtUtil.generateToken(usuario.getId(), usuario.getEmail(), roles);

        AuthResponse.UsuarioResumen resumen = new AuthResponse.UsuarioResumen(
                usuario.getId(),
                usuario.getUsername(),
                usuario.getEmail(),
                usuario.getNombreCompleto()
        );

        log.info("[AUTH][LOGIN] Login exitoso user={} roles={}", usuario.getEmail(), roles);
        return AuthResponse.ofLogin("Login exitoso", token, resumen);
    }

    // ══════════════════════════════════════════════════════════════════
    // SEC-08 — GET /auth/verify-email?token=UUID
    // ══════════════════════════════════════════════════════════════════

    @Transactional
    public String verifyEmail(String token) {

        Usuario usuario = usuarioRepository.findByVerifyToken(token)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Token de verificación inválido o ya usado."));

        if (usuario.isVerified()) {
            return "La cuenta ya estaba verificada.";
        }

        usuario.setVerified(true);
        usuario.setVerifyToken(null);
        usuarioRepository.save(usuario);
        return "Cuenta verificada correctamente.";
    }
}
