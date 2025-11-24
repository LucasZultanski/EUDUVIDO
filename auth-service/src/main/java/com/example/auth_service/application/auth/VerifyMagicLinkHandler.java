package com.example.auth_service.application.auth;

import com.example.auth_service.application.ports.TokenService;
import com.example.auth_service.domain.auth.MagicLink;
import com.example.auth_service.domain.auth.MagicLinkRepository;
import com.example.auth_service.domain.user.User;
import com.example.auth_service.domain.user.UserRepository;
import com.example.auth_service.interfaces.rest.dto.auth.TokenResponse;
import com.example.auth_service.support.Digests;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VerifyMagicLinkHandler {
    private final MagicLinkRepository magicLinkRepository;
    private final UserRepository userRepository;
    private final TokenService tokenService;

    public TokenResponse handle(String rawToken) {
        String hash = Digests.sha256Hex(rawToken);
        Instant now = Instant.now();

        Optional<MagicLink> linkOpt = magicLinkRepository.findValidByHash(hash, now);
        MagicLink link = linkOpt.orElseThrow(() ->
                new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Link invalido ou expirado"));

        UUID userId = link.getUserId();
        User user = userRepository.findById(userId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.UNAUTHORIZED, "usuário não encontrado"));

        link.consume(now);
        magicLinkRepository.save(link);

        TokenService.TokenPair pair = tokenService.issue(user);

        return new TokenResponse(pair.token(), pair.refreshToken(), pair.expiresIn());
    }
}
