package com.nexus.security;

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

    // ✅ ESTE ES EL CONSTRUCTOR QUE EXIGE JAVA PARA LAS VARIABLES FINAL
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
        final String jwt;
        final String userEmail;

        // 1. Si la petición no trae cabecera de autorización o no empieza por "Bearer ", pasa de largo
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // 2. Extraemos el token JWT (quitando la palabra "Bearer ")
        jwt = authHeader.substring(7);
        
        // 3. Extraemos el email o nombre de usuario guardado dentro del token
        userEmail = jwtUtil.extractUsername(jwt);

        // 4. Si hay usuario y el sistema aún no lo ha autenticado en esta petición...
        if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            
            // Buscamos los datos de ese usuario en la base de datos
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);
            
            // 5. Si el token es verídico y no ha caducado
            if (jwtUtil.isTokenValid(jwt, userDetails)) {
                
                // Le creamos su credencial de acceso válida para Spring Security
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );
                
                authToken.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );
                
                // Guardamos el usuario autenticado en el contexto seguro de la app
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }
        
        // 6. Enviamos la petición al siguiente paso o controlador
        filterChain.doFilter(request, response);
    }
}