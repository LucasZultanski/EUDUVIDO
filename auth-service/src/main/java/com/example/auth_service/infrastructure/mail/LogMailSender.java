package com.example.auth_service.infrastructure.mail;

import com.example.auth_service.application.ports.MailSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@Profile({"dev", "local", "test"})
public class LogMailSender implements MailSender {
    private static final Logger log = LoggerFactory.getLogger(LogMailSender.class);

    @Override
    public void sendMagicLink(String to, String magicLink, Instant expiresAt) {
        log.info("[DEV] Magic link para {}: {} (expira em {})", to, magicLink, expiresAt);
    }
}
