package com.nexus.email;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * EmailService — SEC-07: envío del email HTML de verificación de cuenta.
 *
 * @Async: el envío de email se hace en un hilo aparte para no bloquear
 * la respuesta HTTP del registro. El usuario recibe el 201 inmediatamente
 * y el email llega unos segundos después.
 *
 * Para que @Async funcione hay que añadir @EnableAsync en NexusBackendApplication.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    // URL base de la app: http://localhost:8080 en dev, https://tudominio.com en prod
    @Value("${app.base-url}")
    private String appBaseUrl;

    // Remitente que aparece en el email (configurado en application.yml)
    @Value("${spring.mail.username}")
    private String fromEmail;

    // ══════════════════════════════════════════════════════════════════
    // SEC-07 — Envío del email de verificación de cuenta
    // ══════════════════════════════════════════════════════════════════

    /**
     * Envía un email HTML con el enlace de activación de cuenta.
     *
     * El enlace apunta a: GET /api/auth/verify-email?token={token}
     * Ese endpoint lo implementa Sebastián en SEC-08.
     *
     * @param destinatario Email del usuario recién registrado
     * @param username     Nombre de usuario para personalizar el saludo
     * @param token        UUID generado en AuthService.register()
     */
    @Async
    public void sendVerificationEmail(String destinatario, String username, String token) {
        // Construir el enlace completo de verificación
        // Resultado: http://localhost:8080/api/auth/verify-email?token=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        String verificationUrl = appBaseUrl + "/api/auth/verify-email?token=" + token;

        // Construir el HTML del email
        String htmlContent = buildVerificationEmailHtml(username, verificationUrl);

        try {
            MimeMessage message = mailSender.createMimeMessage();

            // MimeMessageHelper con UTF-8 para caracteres especiales en español
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(destinatario);
            helper.setSubject("⚡ Activa tu cuenta en LevelUp Nexus ERP");
            helper.setText(htmlContent, true); // true = es HTML

            mailSender.send(message);
            log.info("[EMAIL] Email de verificación enviado a: {}", destinatario);

        } catch (MessagingException e) {
            // No lanzamos excepción: el registro ya fue exitoso.
            // El usuario puede pedir reenvío del email más adelante.
            log.error("[EMAIL] Error al enviar email de verificación a {}: {}", destinatario, e.getMessage());
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // HTML del email — diseño corporativo de LevelUp Nexus
    // ══════════════════════════════════════════════════════════════════

    private String buildVerificationEmailHtml(String username, String verificationUrl) {
        return """
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Activa tu cuenta — LevelUp Nexus ERP</title>
                </head>
                <body style="margin:0; padding:0; background-color:#F8FAFC; font-family: Arial, sans-serif;">

                    <!-- Contenedor principal -->
                    <table width="100%%" cellpadding="0" cellspacing="0"
                           style="background-color:#F8FAFC; padding: 40px 0;">
                        <tr>
                            <td align="center">
                                <table width="600" cellpadding="0" cellspacing="0"
                                       style="background-color:#ffffff; border-radius:12px;
                                              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                                              overflow:hidden; max-width:600px; width:100%%;">

                                    <!-- Cabecera azul corporativo -->
                                    <tr>
                                        <td style="background-color:#1E3A8A; padding: 32px 40px; text-align:center;">
                                            <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:800;
                                                        letter-spacing:-0.5px;">
                                                ⚡ LevelUp <span style="color:#F97316;">Nexus</span> ERP
                                            </h1>
                                            <p style="margin:8px 0 0; color:#93C5FD; font-size:14px;">
                                                Sistema de Gestión Empresarial
                                            </p>
                                        </td>
                                    </tr>

                                    <!-- Cuerpo del mensaje -->
                                    <tr>
                                        <td style="padding: 40px 40px 32px;">
                                            <h2 style="margin:0 0 16px; color:#1E293B; font-size:22px; font-weight:700;">
                                                ¡Hola, %s! 👋
                                            </h2>
                                            <p style="margin:0 0 16px; color:#475569; font-size:15px; line-height:1.6;">
                                                Tu cuenta en <strong>LevelUp Nexus ERP</strong> ha sido creada correctamente.
                                                Solo falta un paso: confirmar tu dirección de email para activarla.
                                            </p>
                                            <p style="margin:0 0 28px; color:#475569; font-size:15px; line-height:1.6;">
                                                Haz clic en el botón naranja para verificar tu cuenta.
                                                El enlace es válido durante <strong>24 horas</strong>.
                                            </p>

                                            <!-- Botón de acción naranja -->
                                            <div style="text-align:center; margin-bottom:32px;">
                                                <a href="%s"
                                                   style="display:inline-block; background-color:#F97316;
                                                          color:#ffffff; text-decoration:none;
                                                          padding:14px 36px; border-radius:8px;
                                                          font-size:16px; font-weight:700;
                                                          letter-spacing:0.3px;">
                                                    ✅ Activar mi cuenta
                                                </a>
                                            </div>

                                            <!-- Enlace alternativo por si el botón no funciona -->
                                            <p style="margin:0 0 8px; color:#94A3B8; font-size:12px;">
                                                ¿El botón no funciona? Copia y pega este enlace en tu navegador:
                                            </p>
                                            <p style="margin:0; word-break:break-all;">
                                                <a href="%s"
                                                   style="color:#3B82F6; font-size:12px; text-decoration:none;">
                                                    %s
                                                </a>
                                            </p>
                                        </td>
                                    </tr>

                                    <!-- Aviso de seguridad -->
                                    <tr>
                                        <td style="padding: 0 40px 32px;">
                                            <div style="background-color:#FFF7ED; border:1px solid #FED7AA;
                                                        border-radius:8px; padding:16px;">
                                                <p style="margin:0; color:#92400E; font-size:13px; line-height:1.5;">
                                                    🔒 <strong>¿No has solicitado este registro?</strong><br>
                                                    Si no has creado esta cuenta, ignora este email.
                                                    Tu dirección no será utilizada sin confirmar este enlace.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>

                                    <!-- Pie de página -->
                                    <tr>
                                        <td style="background-color:#F1F5F9; padding: 20px 40px; text-align:center;
                                                    border-top: 1px solid #E2E8F0;">
                                            <p style="margin:0; color:#94A3B8; font-size:12px;">
                                                © 2026 LevelUp Nexus ERP · Todos los derechos reservados<br>
                                                Este email fue generado automáticamente, no respondas a él.
                                            </p>
                                        </td>
                                    </tr>

                                </table>
                            </td>
                        </tr>
                    </table>

                </body>
                </html>
                """.formatted(username, verificationUrl, verificationUrl, verificationUrl);
    }
}
