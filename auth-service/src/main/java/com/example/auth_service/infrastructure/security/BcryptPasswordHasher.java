package com.example.auth_service.infrastructure.security;


import com.example.auth_service.application.ports.PasswordHasher;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class BcryptPasswordHasher implements PasswordHasher {
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    @Override
    public String hash(String password) {
        return encoder.encode(password);
    }

    @Override
    public boolean match(String password, String hashedPassword) {
        return encoder.matches(password, hashedPassword);
    }
}
