package com.nexus.service;

import com.nexus.dto.LoginRequest;
import com.nexus.dto.LoginResponse;
import com.nexus.model.Usuario;
import com.nexus.repository.UsuarioRepository;
import com.nexus.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UsuarioRepository usuarioRepository,
                        PasswordEncoder passwordEncoder,
                        JwtUtil jwtUtil) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    // SEC-05 — Login
    public LoginResponse login(LoginRequest request) {
        // Mismo mensaje para email y password incorrectos: no revelamos
        // si el email está registrado o no (seguridad)
        Usuario usuario = usuarioRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Credenciales incorrectas"));

        if (!passwordEncoder.matches(request.getPassword(), usuario.getPassword())) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Credenciales incorrectas");
        }

        if (!usuario.isVerified()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Cuenta no verificada. Revisa tu email.");
        }

        if (!usuario.isActive()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Cuenta desactivada. Contacta con el administrador.");
        }

        String roles = usuario.getRoles().stream()
                .map(r -> r.getNombre())
                .reduce((a, b) -> a + "," + b)
                .orElse("");

        String token = jwtUtil.generateToken(usuario.getId(), usuario.getEmail(), roles);
        return new LoginResponse(token, usuario.getEmail(), roles);
    }

    // SEC-08 — Verificar email
    @Transactional
    public String verifyEmail(String token) {
        Usuario usuario = usuarioRepository.findByVerifyToken(token)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Token de verificación inválido o ya usado."));

        // Comprobar caducidad: el token expira 24h después del registro
        if (usuario.getVerifyExpires() != null
                && usuario.getVerifyExpires().isBefore(OffsetDateTime.now())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El enlace de verificación ha caducado. Solicita uno nuevo.");
        }

        if (usuario.isVerified()) {
            return "La cuenta ya estaba verificada.";
        }

        usuario.setVerified(true);
        usuario.setVerifyToken(null);
        usuario.setVerifyExpires(null);
        usuarioRepository.save(usuario);
        return "Cuenta verificada correctamente.";
    }
}