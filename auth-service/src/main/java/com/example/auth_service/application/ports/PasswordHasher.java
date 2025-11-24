package com.example.auth_service.application.ports;

public interface PasswordHasher {
    String hash(String password);
    boolean match(String password, String hashedPassword);
}
