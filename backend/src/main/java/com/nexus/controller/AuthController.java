package com.nexus.controller;

import com.nexus.dto.LoginRequest;
import com.nexus.dto.LoginResponse;
import com.nexus.dto.RegisterRequest;          // NUEVO
import com.nexus.service.AuthService;
import jakarta.validation.Valid;               // NUEVO
import org.springframework.http.HttpStatus;    // NUEVO
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // SEC-06 · Registro ───────────────────────────────────── NUEVO ──
    @PostMapping("/register")
    public ResponseEntity<String> register(
            @Valid @RequestBody RegisterRequest request) {
        String mensaje = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(mensaje);
    }
    // ────────────────────────────────────────────────────────────────

    // POST /api/auth/login (de tu compañero, no tocar)
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    // GET /api/auth/verify-email?token=UUID (de tu compañero, no tocar)
    @GetMapping("/verify-email")
    public ResponseEntity<String> verifyEmail(@RequestParam String token) {
        return ResponseEntity.ok(authService.verifyEmail(token));
    }
}