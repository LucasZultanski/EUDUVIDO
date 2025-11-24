package com.example.auth_service.application.ports;

import java.time.Instant;

public interface MailSender {
    void sendMagicLink(String to, String magicLink, Instant expiresAt);
}
