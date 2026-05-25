package com.nexus.email;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * SEC-07 — Envío del email HTML de verificación de cuenta.
 * @Async: se ejecuta en hilo separado para no bloquear el HTTP 201.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Value("${app.base-url}")
    private String appBaseUrl;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Async
    public void sendVerificationEmail(String destinatario, String username, String token) {

        String verificationUrl = appBaseUrl + "/api/auth/verify-email?token=" + token;
        String html = buildHtml(username, verificationUrl);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(destinatario);
            helper.setSubject("⚡ Activa tu cuenta en LevelUp Nexus ERP");
            helper.setText(html, true);

            mailSender.send(message);
            log.info("[EMAIL] Email de verificación enviado a: {}", destinatario);

        } catch (MessagingException e) {
            log.error("[EMAIL] Error al enviar email a {}: {}", destinatario, e.getMessage());
        }
    }

    private String buildHtml(String username, String verificationUrl) {
        return """
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <title>Activa tu cuenta — LevelUp Nexus ERP</title>
                </head>
                <body style="margin:0;padding:0;background-color:#F8FAFC;font-family:Arial,sans-serif;">
                    <table width="100%%" cellpadding="0" cellspacing="0"
                            style="background-color:#F8FAFC;padding:40px 0;">
                        <tr><td align="center">
                            <table width="600" cellpadding="0" cellspacing="0"
                                    style="background:#fff;border-radius:12px;
                                            box-shadow:0 4px 20px rgba(0,0,0,0.08);
                                            overflow:hidden;max-width:600px;width:100%%;">

                                <tr>
                                    <td style="background:#1E3A8A;padding:32px 40px;text-align:center;">
                                        <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;">
                                            ⚡ LevelUp <span style="color:#F97316;">Nexus</span> ERP
                                        </h1>
                                        <p style="margin:8px 0 0;color:#93C5FD;font-size:14px;">
                                            Sistema de Gestión Empresarial
                                        </p>
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:40px 40px 32px;">
                                        <h2 style="margin:0 0 16px;color:#1E293B;font-size:20px;">
                                            ¡Hola, %s! 👋
                                        </h2>
                                        <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                                            Tu cuenta en <strong>LevelUp Nexus ERP</strong> ha sido creada.
                                            Haz clic en el botón para activarla. El enlace caduca en
                                            <strong>24 horas</strong>.
                                        </p>
                                        <div style="text-align:center;margin-bottom:32px;">
                                            <a href="%s"
                                                style="display:inline-block;background:#F97316;
                                                        color:#fff;text-decoration:none;
                                                        padding:14px 36px;border-radius:8px;
                                                        font-size:16px;font-weight:700;">
                                                ✅ Activar mi cuenta
                                            </a>
                                        </div>
                                        <p style="margin:0 0 6px;color:#94A3B8;font-size:12px;">
                                            ¿El botón no funciona? Copia este enlace:
                                        </p>
                                        <p style="margin:0;word-break:break-all;">
                                            <a href="%s" style="color:#3B82F6;font-size:12px;">%s</a>
                                        </p>
                                    </td>
                                </tr>

                                <tr>
                                    <td style="background:#F1F5F9;padding:20px 40px;
                                                text-align:center;border-top:1px solid #E2E8F0;">
                                        <p style="margin:0;color:#94A3B8;font-size:12px;">
                                            © 2026 LevelUp Nexus ERP · Email automático, no respondas.
                                        </p>
                                    </td>
                                </tr>

                            </table>
                        </td></tr>
                    </table>
                </body>
                </html>
                """.formatted(username, verificationUrl, verificationUrl, verificationUrl);
    }
}
