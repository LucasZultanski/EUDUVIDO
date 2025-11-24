package com.example.auth_service.infrastructure.persistence;

import com.example.auth_service.domain.auth.MagicLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface SpringDataMagicLink extends JpaRepository<MagicLink, UUID> {
    Optional<MagicLink> findByHashedTokenValueAndConsumedAtIsNullAndExpiresAtValueIsGreaterThan(String tokenHash, Instant now);
}
