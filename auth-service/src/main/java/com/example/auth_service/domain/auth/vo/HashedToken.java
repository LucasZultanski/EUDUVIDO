package com.example.auth_service.domain.auth.vo;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@NoArgsConstructor
@Getter
public class HashedToken {

    @Column(name = "token_hash", nullable = false)
    private String value;

    public HashedToken(String value) {
        String clearValue = value == null ? null : value.trim();

        if (clearValue == null || clearValue.isBlank()) {
            throw new IllegalArgumentException("Token invalido");
        }

        this.value = clearValue;
    }

    public static HashedToken of(String value) {
        return new HashedToken(value);
    }
}
