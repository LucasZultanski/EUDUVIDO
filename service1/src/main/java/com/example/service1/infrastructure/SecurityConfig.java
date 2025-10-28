package com.example.service1.infrastructure;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf().disable()
            .authorizeRequests()
            .antMatchers("/challenges/**").authenticated()
            .anyRequest().permitAll()
            .and()
            .httpBasic();
        return http.build();
    }
}

// Logging
logging.level.org.springframework=INFO
logging.file.name=logs/service1.log

// Database (exemplo para PostgreSQL)
spring.datasource.url=jdbc:postgresql://localhost:5432/service1db
spring.datasource.username=service1user
spring.datasource.password=securepassword
spring.jpa.hibernate.ddl-auto=validate