package com.example.auth_service.domain.user.vo;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@NoArgsConstructor
public class Email {

    @jakarta.validation.constraints.Email
    @Column(name = "email", nullable = false, unique = true)
    private String value;

    public static Email of(String value) {
        return new Email(value);
    }

    public Email(String value) {
        this.value = normalize(value);

        if (this.value == null || this.value.isBlank()) {
            throw new IllegalArgumentException("Email não pode ser vazio");
        }
    }

    private static String normalize(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

}
