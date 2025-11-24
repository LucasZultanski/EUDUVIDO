package com.example.auth_service.application.ports;

import com.example.auth_service.domain.user.User;

public interface TokenService {
    TokenPair issue(User user);

    record TokenPair(String token, String refreshToken, long expiresIn) {}
}
