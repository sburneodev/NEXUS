package com.nexus.service;

import com.nexus.dto.LoginRequest;
import com.nexus.dto.LoginResponse;
import com.nexus.model.Usuario;
import com.nexus.repository.UsuarioRepository;
import com.nexus.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

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

 
    }
