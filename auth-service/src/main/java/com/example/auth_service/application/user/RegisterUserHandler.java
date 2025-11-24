package com.example.auth_service.application.user;

import com.example.auth_service.application.ports.PasswordHasher;
import com.example.auth_service.domain.user.User;
import com.example.auth_service.domain.user.UserRepository;
import com.example.auth_service.domain.user.vo.Email;
import com.example.auth_service.domain.user.vo.RoleType;
import com.example.auth_service.interfaces.rest.dto.user.UserResponse;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@Service
@RequiredArgsConstructor
public class RegisterUserHandler {
    private final UserRepository userRepository;
    private final PasswordHasher passwordHasher;

    @Transactional
    public UserResponse handle(String nome, String emailRaw, String senha) {
        log.info("Tentativa de registro - Nome: {}, Email: {}", nome, emailRaw);
        
        Email email = Email.of(emailRaw);
        String normalizedEmail = email.getValue();
        log.info("Email normalizado: {}", normalizedEmail);
        
        // Verifica se o email já existe
        if (userRepository.existsByEmail(normalizedEmail)) {
            log.warn("Tentativa de registro com email já existente: {}", normalizedEmail);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email já está em uso");
        }

        String hash = passwordHasher.hash(senha);
        User user = new User(nome, hash, email, RoleType.CUSTOMER);

        User saved = userRepository.save(user);
        log.info("Usuário registrado com sucesso - ID: {}, Email: {}", saved.getId(), saved.getEmail().getValue());
        
        return new UserResponse(
                saved.getId(),
                saved.getName(),
                saved.getEmail().getValue(),
                saved.getRole().getValue().name()
        );
    }
}
