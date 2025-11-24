package com.example.auth_service.application.auth;

import com.example.auth_service.application.ports.MailSender;
import com.example.auth_service.domain.auth.MagicLink;
import com.example.auth_service.domain.auth.MagicLinkRepository;
import com.example.auth_service.domain.auth.vo.ExpiresAt;
import com.example.auth_service.domain.auth.vo.HashedToken;
import com.example.auth_service.domain.user.User;
import com.example.auth_service.domain.user.UserRepository;
import com.example.auth_service.domain.user.vo.Email;
import com.example.auth_service.infrastructure.config.AppProperties;
import com.example.auth_service.support.Digests;
import com.example.auth_service.support.RandomTokenGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RequestMagicLinkHandler {
    private final UserRepository userRepository;
    private final MagicLinkRepository magicLinkRepository;
    private final MailSender mailSender;
    private final AppProperties appProperties;

    public record Result(boolean accepted) {}

    public Result handle(String email) {
        Email emailObj = Email.of(email);

        Optional<User> userOpt = userRepository.findByEmail(emailObj.getValue());
        if (userOpt.isEmpty()) {
            return new Result(true);
        }
        
        User user = userOpt.get();

        String token = RandomTokenGenerator.urlSafeToken(32);
        String hash = Digests.sha256Hex(token);

        Instant now = Instant.now();
        long ttl = appProperties.getMagicLink().getTtlSeconds();
        Instant expiresAt = now.plusSeconds(appProperties.getMagicLink().getTtlSeconds());

        MagicLink link = MagicLink.issueForLogin(
            user.getId(),
            HashedToken.of(hash),
            ExpiresAt.of(expiresAt)
        );
        magicLinkRepository.save(link);

        String base = appProperties.getMagicLink().getVerifyUrlBase();
        String url = base + (base.contains("?") ? "&" : "?") +
                "token=" + URLEncoder.encode(token, StandardCharsets.UTF_8);

        mailSender.sendMagicLink(emailObj.getValue(), url, expiresAt);
        return new Result(true);
    }
}
