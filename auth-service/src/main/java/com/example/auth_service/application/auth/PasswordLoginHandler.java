package com.example.auth_service.application.auth;

import com.example.auth_service.application.ports.PasswordHasher;
import com.example.auth_service.application.ports.TokenService;
import com.example.auth_service.domain.user.User;
import com.example.auth_service.domain.user.UserRepository;
import com.example.auth_service.domain.user.vo.Email;
import com.example.auth_service.interfaces.rest.dto.auth.TokenResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordLoginHandler {

    private final UserRepository userRepository;
    private final PasswordHasher passwordHasher;
    private final TokenService tokenService;

    public TokenResponse handle(String emailRaw, String pwRaw) {
        log.info("Tentativa de login com email: {}", emailRaw);
        
        Email email = Email.of(emailRaw);
        String normalizedEmail = email.getValue();
        log.info("Email normalizado: {}", normalizedEmail);
        
        Optional<User> userOptional = userRepository.findByEmail(normalizedEmail);

        if (!userOptional.isPresent()) {
            log.warn("Usuário não encontrado com email: {}", normalizedEmail);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credencial invalido");
        }

        User user = userOptional.get();
        log.info("Usuário encontrado: {} (ID: {})", user.getEmail().getValue(), user.getId());
        
        boolean passwordMatches = passwordHasher.match(pwRaw, user.getPassword());
        log.info("Senha corresponde: {}", passwordMatches);
        
        if (!passwordMatches) {
            log.warn("Senha incorreta para usuário: {}", normalizedEmail);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credencial invalido");
        }

        log.info("Login bem-sucedido para usuário: {}", normalizedEmail);
        TokenService.TokenPair pair = tokenService.issue(user);
        return new TokenResponse(pair.token(), pair.refreshToken(), pair.expiresIn());
    }
}
