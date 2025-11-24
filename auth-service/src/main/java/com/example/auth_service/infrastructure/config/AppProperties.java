package com.example.auth_service.infrastructure.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app")
@Getter
public class AppProperties {

    private final MagicLink magicLink = new MagicLink();

    @Getter
    @Setter
    public static class MagicLink {
        private long ttlSeconds;
        private String verifyUrlBase;
    }
}
