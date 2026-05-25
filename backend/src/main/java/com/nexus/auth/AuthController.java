package com.nexus.auth;

import com.nexus.auth.dto.AuthResponse;
import com.nexus.auth.dto.RegisterRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * AuthController — Endpoints públicos de autenticación.
 *
 * Base path: /auth
 * context-path en application.yml es /api → URL completa: /api/auth/*
 *
 * Rutas implementadas aquí:
 *   POST /api/auth/register  ← SEC-06 (Desirée) ✅
 *
 * Rutas que añadirá Sebastián en este mismo archivo:
 *   POST /api/auth/login          ← SEC-05
 *   GET  /api/auth/verify-email   ← SEC-08
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    // Logger manual — sustituye a @Slf4j de Lombok
    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;

    // Constructor manual — sustituye a @RequiredArgsConstructor de Lombok
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // ── SEC-06 · Registro ─────────────────────────────────────────────
    /**
     * POST /api/auth/register
     *
     * Body JSON esperado:
     * {
     *   "username":       "cajero01",
     *   "email":          "cajero01@levelupnexus.es",
     *   "password":       "MiPassword123!",
     *   "nombreCompleto": "Juan García"          ← opcional
     * }
     *
     * Respuestas:
     *   201 Created     → Registro exitoso, email enviado
     *   400 Bad Request → Validación fallida (campo vacío, email inválido…)
     *   409 Conflict    → Email o username ya en uso
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        log.info("[AUTH] POST /register — username={}", request.getUsername());
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ── Sebastián añade aquí login() y verifyEmail() ──────────────────
    // No añadir nada más en este archivo por ahora.
}
