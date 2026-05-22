package com.nexus.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import org.springframework.security.core.userdetails.UserDetails;
import java.util.function.Function;

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

    //Extraer el email (subject) del token
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    //Validar si el token pertenece al usuario y no ha expirado
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        // Es válido si el email coincide y si la fecha actual es anterior a la caducidad
        return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
    }

    // Comprobar si el token ha caducado
    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    // Extraer la fecha exacta de caducidad
    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    //Método genérico para extraer cualquier dato (Claim)
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    //El motor de descifrado: Abre el token usando la firma secreta
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey()) // Usa tu clave secreta para comprobar que nadie lo manipuló
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}