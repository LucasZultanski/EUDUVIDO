package com.example.auth_service.infrastructure.config;

import com.example.auth_service.application.user.RegisterUserHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.nio.file.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final RegisterUserHandler registerUserHandler;
    private static final String PURGE_MARKER = ".users_purge_done";

    @Override
    public void run(String... args) {
        try {
            executarPurgaUsuariosUmaVez();
        } catch (Exception e) {
            log.warn("Falha ao executar purga de usuários: {}", e.getMessage());
        }

        try {
            registerUserHandler.handle("Usuário Teste", "teste@teste.com", "12345678");
            log.info("✅ Usuário de teste criado: teste@teste.com / senha: 12345678");
        } catch (Exception e) {
            log.warn("Usuário de teste já existe ou erro ao criar: {}", e.getMessage());
        }
    }

    private void executarPurgaUsuariosUmaVez() throws Exception {
        Path marker = Paths.get(PURGE_MARKER);
        if (Files.exists(marker)) {
            log.info("Purga de usuários já foi executada anteriormente. Pulando.");
            return;
        }
        log.warn("⚠️ Executando purga única de TODOS os usuários...");
        // ...aqui seria o código real de purga, se implementado...
        Files.createFile(marker);
        log.info("Marcador de purga criado: {}", PURGE_MARKER);
    }
}
