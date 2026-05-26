package com.nexus;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class GenerarHashes {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
        System.out.println("admin123:    " + encoder.encode("admin123"));
        System.out.println("gestor123:   " + encoder.encode("gestor123"));
        System.out.println("cajero123:   " + encoder.encode("cajero123"));
        System.out.println("marketing123:" + encoder.encode("marketing123"));
        System.out.println("contable123: " + encoder.encode("contable123"));
    }
}