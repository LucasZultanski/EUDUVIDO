package com.example.auth_service.domain.auth;

import com.example.auth_service.domain.auth.vo.ExpiresAt;
import com.example.auth_service.domain.auth.vo.HashedToken;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Table(name = "magic_link")
@Entity
@NoArgsConstructor
@Getter
@Setter
public class MagicLink {

    @Id
    @Column(nullable = false, updatable = false)
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    @Embedded
    private HashedToken hashedToken;

    @Embedded
    private ExpiresAt expiresAt;

    @Column
    private Instant consumedAt;

    public MagicLink(UUID userId, HashedToken hashedToken, ExpiresAt expiresAt) {
        this.userId = userId;
        this.hashedToken = hashedToken;
        this.expiresAt = expiresAt;
    }

    public static MagicLink issueForLogin(UUID userId, HashedToken hashedToken, ExpiresAt expiresAt) {
        return new MagicLink(userId, hashedToken, expiresAt);
    }

    public boolean isExpired(Instant now) {
        return !expiresAt.isAfter(now);
    }

    public boolean isConsumed() {
        return this.consumedAt != null;
    }

    public boolean isValidAt(Instant now) {
        return !this.isConsumed() && !this.isExpired(now);
    }

    public void consume(Instant now) {
        if (this.isConsumed()) {
            throw new IllegalStateException("Link consumido");
        }

        if (this.isExpired(now)) {
            throw new IllegalStateException("Link expirado");
        }

        this.consumedAt = now;
    }
}
