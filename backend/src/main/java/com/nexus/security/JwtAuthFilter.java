package com.nexus.security;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    public JwtAuthFilter(JwtUtil jwtUtil, UserDetailsService userDetailsService) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        System.out.println(">>> AUTH HEADER: " + authHeader);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);

        try {
            final String userEmail = jwtUtil.extractUsername(jwt);
            System.out.println(">>> EMAIL EXTRAIDO: " + userEmail);

            if (userEmail != null) {
                System.out.println(">>> ENTRANDO AL IF...");

                // CAPTURAMOS LA AUTENTICACIÓN ACTUAL DEL CONTEXTO
                Authentication currentAuth = SecurityContextHolder.getContext().getAuthentication();

                // EVALUAMOS SI ES NULA O SI SPRING LE ASIGNÓ EL USUARIO "ANÓNIMO"
                if (currentAuth == null || currentAuth instanceof AnonymousAuthenticationToken) {
                    System.out.println(">>> CONTEXTO ES NULL O ANÓNIMO, BUSCANDO EN BD...");

                    UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);

                    if (userDetails == null) {
                        System.out.println(">>> ❌ ERROR: userDetailsService devolvió NULL en lugar de lanzar excepción.");
                    } else {
                        System.out.println(">>> AUTHORITIES BD: " + userDetails.getAuthorities());

                        if (jwtUtil.isTokenValid(jwt, userDetails)) {
                            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                    userDetails, null, userDetails.getAuthorities()
                            );
                            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                            SecurityContextHolder.getContext().setAuthentication(authToken);
                            System.out.println(">>> ✅ AUTENTICACIÓN EXITOSA");
                        } else {
                            System.out.println(">>> ❌ TOKEN INVÁLIDO PARA ESTE USUARIO");
                        }
                    }
                } else {
                    System.out.println(">>> ⚠️ EL CONTEXTO YA ESTABA AUTENTICADO COMO: " + currentAuth.getName());
                }
            }
        } catch (Throwable t) { 
            System.out.println(">>> 🚨 ERROR CRÍTICO CAPTURADO: " + t.getClass().getName() + " - " + t.getMessage());
            t.printStackTrace();
        }

        filterChain.doFilter(request, response);
    }
}