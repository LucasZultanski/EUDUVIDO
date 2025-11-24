package com.example.auth_service.domain.auth.vo;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Embeddable
@NoArgsConstructor
@Getter
public class ExpiresAt {

    @Column(name = "expires_at", nullable = false)
    private Instant value;

    public ExpiresAt(Instant value) {
        if (value == null) {
            throw new NullPointerException("expiresAt é orbigatorio");
        }

        this.value = value;
    }

    public static ExpiresAt of(Instant value) {
        return new ExpiresAt(value);
    }

    public boolean isAfter(Instant other) {
        return this.value.isAfter(other);
    }
}
