package com.example.auth_service.interfaces.rest.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record PasswordLoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password
) {
}
