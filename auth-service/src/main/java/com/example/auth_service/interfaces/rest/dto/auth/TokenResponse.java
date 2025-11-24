package com.example.auth_service.interfaces.rest.dto.auth;

public record TokenResponse (
    String accessToken,
    String refreshToken,
    long expiresIn
) {}
