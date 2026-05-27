package com.nexus.service;

import com.nexus.auth.AuthService;
import com.nexus.auth.dto.AuthResponse;
import com.nexus.dto.LoginRequest;
import com.nexus.email.EmailService;
import com.nexus.model.Rol;
import com.nexus.model.Usuario;
import com.nexus.repository.UsuarioRepository;
import com.nexus.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private PasswordEncoder   passwordEncoder;
    @Mock private JwtUtil           jwtUtil;
    @Mock private EmailService      emailService;       // requerido por com.nexus.auth.AuthService
    @InjectMocks private AuthService authService;

    private Usuario usuarioValido() {
        Rol rol = new Rol(); rol.setNombre("CAJERO");
        Usuario u = new Usuario();
        u.setEmail("cajero@test.es");
        u.setPassword("$2a$12$hash");
        u.setVerified(true);
        u.setActive(true);
        u.setUsername("cajero01");
        u.setRoles(Set.of(rol));
        return u;
    }

    @Test
    void login_valido_devuelve_token() {
        LoginRequest req = new LoginRequest();
        req.setEmail("cajero@test.es");
        req.setPassword("cajero123");

        when(usuarioRepository.findByEmail("cajero@test.es")).thenReturn(Optional.of(usuarioValido()));
        when(passwordEncoder.matches("cajero123", "$2a$12$hash")).thenReturn(true);
        when(jwtUtil.generateToken(any(), eq("cajero@test.es"), anyString())).thenReturn("token.jwt");

        AuthResponse response = authService.login(req);
        assertEquals("token.jwt", response.getToken());
    }

    @Test
    void login_password_incorrecta_lanza_excepcion() {
        LoginRequest req = new LoginRequest();
        req.setEmail("cajero@test.es");
        req.setPassword("wrongpass");

        when(usuarioRepository.findByEmail("cajero@test.es")).thenReturn(Optional.of(usuarioValido()));
        when(passwordEncoder.matches("wrongpass", "$2a$12$hash")).thenReturn(false);

        assertThrows(RuntimeException.class, () -> authService.login(req));
    }

    @Test
    void login_usuario_no_encontrado_lanza_excepcion() {
        LoginRequest req = new LoginRequest();
        req.setEmail("noexiste@test.es");
        req.setPassword("pass");

        when(usuarioRepository.findByEmail("noexiste@test.es")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> authService.login(req));
    }

    @Test
    void login_cuenta_no_verificada_lanza_excepcion() {
        Usuario u = usuarioValido();
        u.setVerified(false);
        LoginRequest req = new LoginRequest();
        req.setEmail("cajero@test.es");
        req.setPassword("cajero123");

        when(usuarioRepository.findByEmail("cajero@test.es")).thenReturn(Optional.of(u));
        when(passwordEncoder.matches("cajero123", "$2a$12$hash")).thenReturn(true);

        assertThrows(RuntimeException.class, () -> authService.login(req));
    }

    @Test
    void verify_email_token_invalido_lanza_excepcion() {
        when(usuarioRepository.findByVerifyToken("token-invalido")).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> authService.verifyEmail("token-invalido"));
    }
}
