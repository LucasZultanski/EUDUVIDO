package com.example.auth_service.domain.auth;

import com.example.auth_service.domain.auth.vo.HashedToken;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface MagicLinkRepository {
    MagicLink save(MagicLink magicLink);

    Optional<MagicLink> findById(UUID id);
    Optional<MagicLink> findValidByHash(String hashedToken, Instant now);
}
