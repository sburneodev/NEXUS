package com.nexus.audit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;

/**
 * AuditService — punto central de escritura del log de auditoría.
 *
 * Complementa los triggers de BD (que capturan INSERT/UPDATE/DELETE a nivel SQL)
 * añadiendo contexto de aplicación: quién hizo la acción (email del usuario
 * autenticado) e IP de la petición.
 *
 * USO:
 *   auditService.log("PRODUCTO", "CREATE", producto.getId(), "SKU: PS5-001");
 *   auditService.logAuth("user@mail.com", "LOGIN", "Login exitoso");
 *
 * Las excepciones se capturan internamente: un fallo en auditoría NUNCA
 * interrumpe la operación de negocio principal.
 */
@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final JdbcTemplate jdbcTemplate;

    public AuditService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // ── API pública ───────────────────────────────────────────────────────────

    /**
     * Registra una acción de negocio usando el usuario del SecurityContextHolder.
     * Para usar en todos los servicios de negocio (Producto, Cliente, Stock…).
     *
     * @param entidad    nombre lógico de la entidad (PRODUCTO, CLIENTE, STOCK…)
     * @param operacion  tipo de operación (CREATE, UPDATE, DELETE, ACTIVATE…)
     * @param idRegistro ID del registro afectado, o null si no aplica
     * @param detalles   descripción human-readable de la acción
     */
    public void log(String entidad, String operacion, Long idRegistro, String detalles) {
        try {
            String email = getEmailActual();
            String ip    = getIp();
            escribir(entidad, operacion, idRegistro, email, ip, detalles);
        } catch (Exception e) {
            log.warn("[AUDIT] Error al registrar operacion={} entidad={}: {}",
                     operacion, entidad, e.getMessage());
        }
    }

    /**
     * Registra un evento de autenticación (LOGIN, REGISTER, VERIFY_EMAIL…).
     * El email se pasa explícitamente porque en el momento del login
     * el SecurityContextHolder aún NO está poblado con el usuario.
     *
     * @param email     email del usuario que realizó la acción
     * @param operacion LOGIN | LOGOUT | REGISTER | VERIFY_EMAIL
     * @param detalles  descripción adicional
     */
    public void logAuth(String email, String operacion, String detalles) {
        try {
            String ip = getIp();
            escribir("AUTH", operacion, null, email, ip, detalles);
        } catch (Exception e) {
            log.warn("[AUDIT] Error al registrar auth operacion={}: {}",
                     operacion, e.getMessage());
        }
    }

    // ── Internos ──────────────────────────────────────────────────────────────

    private void escribir(String entidad, String operacion, Long idRegistro,
                          String email, String ip, String detalles) {
        jdbcTemplate.update(
            "INSERT INTO audit_log " +
            "(tabla, operacion, id_registro, usuario_email, ip, detalles) " +
            "VALUES (?, ?, ?, ?, ?, ?)",
            entidad,
            operacion,
            idRegistro != null ? idRegistro.toString() : null,
            email,
            ip,
            detalles
        );
    }

    private String getEmailActual() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()
                    && !"anonymousUser".equals(String.valueOf(auth.getPrincipal()))) {
                return auth.getName();
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String getIp() {
        try {
            ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.currentRequestAttributes();
            HttpServletRequest req = attrs.getRequest();
            // Soporte para proxies / balanceadores (X-Forwarded-For)
            String forwarded = req.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
            String addr = req.getRemoteAddr();
            // Normalizar loopback IPv6 → IPv4 estándar
            if ("0:0:0:0:0:0:0:1".equals(addr) || "::1".equals(addr)) {
                return "127.0.0.1";
            }
            return addr;
        } catch (Exception ignored) {}
        return null;
    }
}
