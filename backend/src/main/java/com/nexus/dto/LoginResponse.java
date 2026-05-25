package com.nexus.dto;

public class LoginResponse {
    private String token;
    private String email;
    private String roles;

    public LoginResponse(String token, String email, String roles) {
        this.token = token;
        this.email = email;
        this.roles = roles;
    }

    public String getToken() { return token; }
    public String getEmail() { return email; }
    public String getRoles() { return roles; }
}