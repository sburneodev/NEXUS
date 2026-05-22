package com.nexus.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtUtil {

    // Lee la clave secreta desde el application.yml
    @Value("${jwt.secret}")
    private String secretKey;

    // 8 horas en milisegundos (exigencia de la SEC-02)
    private final long EXPIRATION_TIME = 8 * 60 * 60 * 1000;

    // Prepara la "firma" criptográfica
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes());
    }

    // El método que fabrica el billete VIP
    public String generateToken(Long userId, String username, String role) {
        return Jwts.builder()
                .subject(username)                  // A quién pertenece (username)
                .claim("userId", userId)            // Dato extra: ID del usuario
                .claim("roles", role)               // Dato extra: El rol (ADMIN, CAJERO...)
                .issuedAt(new Date())               // Fecha de creación (ahora)
                .expiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME)) // Fecha de caducidad
                .signWith(getSigningKey())          // Lo sellamos con nuestra firma secreta
                .compact();                         // Lo empaquetamos en un String
    }
}