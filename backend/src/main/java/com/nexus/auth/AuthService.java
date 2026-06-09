package com.nexus.auth;

import com.nexus.audit.AuditService;
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

import com.nexus.auth.dto.ChangePasswordRequest;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final String LoginString="LOGIN";

    /** Contraseña temporal asignada a todos los usuarios creados por el admin. */
    static final String TEMP_PASSWORD = "NEXUS2026!";
    private final UsuarioRepository  usuarioRepository;
    private final PasswordEncoder    passwordEncoder;
    private final EmailService       emailService;
    private final JwtUtil            jwtUtil;
    private final AuditService       auditService;

    public AuthService(UsuarioRepository usuarioRepository,
                       PasswordEncoder passwordEncoder,
                       EmailService emailService,
                       JwtUtil jwtUtil,
                       AuditService auditService) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder   = passwordEncoder;
        this.emailService      = emailService;
        this.jwtUtil           = jwtUtil;
        this.auditService      = auditService;
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

        auditService.logAuth(
                guardado.getEmail(),
                "REGISTER",
                "Nuevo usuario registrado: " + guardado.getUsername()
        );

        return AuthResponse.ofMessage(
                "Registro exitoso. Hemos enviado un enlace de activación a " + guardado.getEmail()
        );
    }

    // ══════════════════════════════════════════════════════════════════
    // SEC-05 — POST /auth/login
    // ══════════════════════════════════════════════════════════════════

    public AuthResponse login(LoginRequest loginRequest) {

        Usuario usuario = usuarioRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Credenciales incorrectas"));

        if (!passwordEncoder.matches(loginRequest.getPassword(), usuario.getPassword())) {
            auditService.logAuth(loginRequest.getEmail(), LoginString,
                    "Intento fallido — credenciales incorrectas");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales incorrectas");
        }

        if (!usuario.isVerified()) {
            auditService.logAuth(loginRequest.getEmail(),  LoginString,
                    "Intento fallido — cuenta no verificada");
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cuenta no verificada. Revisa tu email.");
        }

        if (!usuario.isActive()) {
            auditService.logAuth(loginRequest.getEmail(),  LoginString,
                    "Intento fallido — cuenta desactivada");
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cuenta desactivada. Contacta con el administrador.");
        }

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

        // Detectar primer acceso: el hash en BD coincide con la contraseña temporal
        boolean mustChangePassword = passwordEncoder.matches(TEMP_PASSWORD, usuario.getPassword());

        log.info("[AUTH][LOGIN] Login exitoso user={} roles={} mustChangePassword={}",
                usuario.getEmail(), roles, mustChangePassword);

        auditService.logAuth(
                usuario.getEmail(),
                LoginString,
                "Login exitoso | roles: " + (roles.isBlank() ? "ninguno" : roles)
                        + (mustChangePassword ? " | PRIMER ACCESO — contraseña temporal" : "")
        );

        AuthResponse response = AuthResponse.ofLogin("Login exitoso", token, resumen);
        response.setMustChangePassword(mustChangePassword);
        return response;
    }

    // ══════════════════════════════════════════════════════════════════
    // POST /auth/change-password — usuario autenticado cambia su contraseña
    // ══════════════════════════════════════════════════════════════════

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        if (!passwordEncoder.matches(request.getOldPassword(), usuario.getPassword())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "La contraseña actual es incorrecta");
        }

        usuario.setPassword(passwordEncoder.encode(request.getNewPassword()));
        usuarioRepository.save(usuario);

        auditService.logAuth(email, "CHANGE_PASSWORD", "Contraseña actualizada por el usuario");
        log.info("[AUTH][CHANGE_PASSWORD] Contraseña cambiada user={}", email);
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

        auditService.logAuth(
                usuario.getEmail(),
                "VERIFY_EMAIL",
                "Email verificado correctamente"
        );

        return "Cuenta verificada correctamente.";
    }
}
