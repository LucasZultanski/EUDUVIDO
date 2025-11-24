package com.example.auth_service.support;

import lombok.NoArgsConstructor;

import java.security.SecureRandom;
import java.util.Base64;

@NoArgsConstructor
public class RandomTokenGenerator {
    public static final SecureRandom random = new SecureRandom();

    public static String urlSafeToken(int length) {
        byte[] bytes = new byte[length];

        random.nextBytes(bytes);

        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
