package com.nexus.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;

/**
 * CookieConsentController — POST /privacy/consent
 *
 * Endpoint público (sin autenticación requerida) que registra en audit_log
 * la decisión de consentimiento de cookies del usuario.
 *
 * Es accesible antes del login para poder registrar consentimientos
 * de usuarios anónimos. Usa la tabla audit_log existente.
 */
@RestController
@RequestMapping("/privacy")
public class CookieConsentController {

    private final JdbcTemplate jdbcTemplate;

    public CookieConsentController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public record ConsentRequest(
            String usuarioEmail,
            String accion,
            String detalles
    ) {}

    /**
     * POST /api/privacy/consent
     *
     * Body: { usuarioEmail, accion, detalles }
     * Registra la decisión en audit_log sin requerir autenticación.
     */
    @PostMapping("/consent")
    public ResponseEntity<Void> registrar(
            @RequestBody ConsentRequest body,
            HttpServletRequest request) {

        String email = (body.usuarioEmail() != null && !body.usuarioEmail().isBlank())
                ? body.usuarioEmail()
                : "Anonimo";

        String ip = getIp(request);

        jdbcTemplate.update(
            "INSERT INTO audit_log (tabla, operacion, id_registro, usuario_email, ip, detalles) " +
            "VALUES (?, ?, ?, ?, ?, ?)",
            "COOKIES",
            body.accion(),
            null,
            email,
            ip,
            body.detalles()
        );

        return ResponseEntity.ok().build();
    }

    private String getIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String addr = request.getRemoteAddr();
        return ("0:0:0:0:0:0:0:1".equals(addr) || "::1".equals(addr)) ? "127.0.0.1" : addr;
    }
}
