package com.nexus.service;

import com.nexus.dto.LoginRequest;
import com.nexus.dto.LoginResponse;
import com.nexus.dto.RegisterRequest;          // NUEVO
import com.nexus.email.EmailService;            // NUEVO
import com.nexus.model.Usuario;
import com.nexus.repository.UsuarioRepository;
import com.nexus.security.JwtUtil;
import org.springframework.http.HttpStatus;     // NUEVO
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; // NUEVO
import org.springframework.web.server.ResponseStatusException;   // NUEVO

import java.util.UUID;                          // NUEVO

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;    // NUEVO

    public AuthService(UsuarioRepository usuarioRepository,
                    PasswordEncoder passwordEncoder,
                    JwtUtil jwtUtil,
                       EmailService emailService) {   // NUEVO
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;             // NUEVO
    }

    // ── SEC-06 · Registro ────────────────────────────────── NUEVO ──
    @Transactional
    public String register(RegisterRequest request) {

        if (usuarioRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "El email '" + request.getEmail() + "' ya está registrado.");
        }

        String verifyToken = UUID.randomUUID().toString();

        Usuario nuevoUsuario = new Usuario();
        nuevoUsuario.setEmail(request.getEmail());
        nuevoUsuario.setPassword(passwordEncoder.encode(request.getPassword()));
        nuevoUsuario.setVerified(false);
        nuevoUsuario.setVerifyToken(verifyToken);

        usuarioRepository.save(nuevoUsuario);

        // SEC-07: enviar email de verificación en hilo aparte
        emailService.sendVerificationEmail(
            request.getEmail(),
            request.getEmail(),
            verifyToken
        );

        return "Registro exitoso. Revisa tu email para activar la cuenta.";
    }
    // ────────────────────────────────────────────────────────────────

    // SEC-05 — Login (de tu compañero, no tocar)
    public LoginResponse login(LoginRequest request) {
        Usuario usuario = usuarioRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Credenciales incorrectas"));

        if (!passwordEncoder.matches(request.getPassword(), usuario.getPassword())) {
            throw new RuntimeException("Credenciales incorrectas");
        }

        if (!usuario.isVerified()) {
            throw new RuntimeException("Cuenta no verificada. Revisa tu email.");
        }

        String roles = usuario.getRoles().stream()
                .map(r -> r.getNombre())
                .reduce((a, b) -> a + "," + b)
                .orElse("");

        String token = jwtUtil.generateToken(usuario.getId(), usuario.getEmail(), roles);
        return new LoginResponse(token, usuario.getEmail(), roles);
    }

    public String verifyEmail(String token) {
        Usuario usuario = usuarioRepository.findByVerifyToken(token)
                .orElseThrow(() -> new RuntimeException("Token de verificación inválido"));

        if (usuario.isVerified()) {
            return "La cuenta ya estaba verificada.";
        }

        usuario.setVerified(true);
        usuario.setVerifyToken(null);
        usuarioRepository.save(usuario);
        return "Cuenta verificada correctamente.";
    }
}
