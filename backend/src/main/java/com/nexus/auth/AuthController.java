package com.nexus.auth;

import com.nexus.auth.dto.AuthResponse;
import com.nexus.auth.dto.ChangePasswordRequest;
import com.nexus.auth.dto.RegisterRequest;
import com.nexus.dto.LoginRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * AuthController — Endpoints públicos de autenticación.
 * Base path: /auth  →  URL completa con context-path /api: /api/auth/*
 *
 * POST /api/auth/register     SEC-06 ✅
 * POST /api/auth/login        SEC-05 ✅
 * GET  /api/auth/verify-email SEC-08 ✅
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // ── SEC-06 · Registro ─────────────────────────────────────────────
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request) {
        log.info("[AUTH] POST /register — username={}", request.getUsername());
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ── SEC-05 · Login ────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @RequestBody LoginRequest request) {
        log.info("[AUTH] POST /login — email={}", request.getEmail());
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    // ── Cambiar contraseña (usuario autenticado) ──────────────────────
    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@RequestBody ChangePasswordRequest request) {
        log.info("[AUTH] POST /change-password");
        authService.changePassword(request);
        return ResponseEntity.noContent().build();
    }

    // ── SEC-08 · Verificar email ──────────────────────────────────────
    @GetMapping("/verify-email")
    public ResponseEntity<String> verifyEmail(@RequestParam String token) {
        log.info("[AUTH] GET /verify-email");
        return ResponseEntity.ok(authService.verifyEmail(token));
    }
}
