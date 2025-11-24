package com.example.auth_service.interfaces.rest.dto.user;

import java.util.UUID;

public record UserResponse(
        UUID id,
        String name,
        String email,
        String role
) {
}
