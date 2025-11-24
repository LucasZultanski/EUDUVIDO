package com.example.challenge_service.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.DatabaseMetaData;
import java.sql.ResultSet;

@Slf4j
@Component
@Order(1)
public class DatabaseMigration {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void migrate() {
        try {
            // Verificar se a coluna invite_permission existe
            boolean hasInvitePermission = columnExists("challenges", "invite_permission");
            if (!hasInvitePermission) {
                log.info("Adicionando coluna invite_permission...");
                jdbcTemplate.execute("ALTER TABLE challenges ADD COLUMN invite_permission VARCHAR(50) DEFAULT 'CREATOR_ONLY' NOT NULL");
                log.info("Coluna invite_permission adicionada com sucesso");
            }

            // Verificar se a coluna max_participants existe
            boolean hasMaxParticipants = columnExists("challenges", "max_participants");
            if (!hasMaxParticipants) {
                log.info("Adicionando coluna max_participants...");
                jdbcTemplate.execute("ALTER TABLE challenges ADD COLUMN max_participants INTEGER");
                log.info("Coluna max_participants adicionada com sucesso");
            }

            // NOVO: Verificar se a coluna proofs_per_day existe
            boolean hasProofsPerDay = columnExists("challenges", "proofs_per_day");
            if (!hasProofsPerDay) {
                log.info("Adicionando coluna proofs_per_day...");
                jdbcTemplate.execute("ALTER TABLE challenges ADD COLUMN proofs_per_day INTEGER");
                log.info("Coluna proofs_per_day adicionada com sucesso");
            }
        } catch (Exception e) {
            log.error("Erro ao executar migração do banco de dados: " + e.getMessage(), e);
        }
    }

    private boolean columnExists(String tableName, String columnName) {
        try {
            var dataSource = jdbcTemplate.getDataSource();
            if (dataSource == null) {
                return false;
            }
            try (var connection = dataSource.getConnection()) {
                DatabaseMetaData metaData = connection.getMetaData();
                try (ResultSet columns = metaData.getColumns(null, null, tableName.toUpperCase(), columnName.toUpperCase())) {
                    return columns.next();
                }
            }
        } catch (Exception e) {
            // Tentar com nome em minúsculas
            try {
                var dataSource = jdbcTemplate.getDataSource();
                if (dataSource == null) {
                    return false;
                }
                try (var connection = dataSource.getConnection()) {
                    DatabaseMetaData metaData = connection.getMetaData();
                    try (ResultSet columns = metaData.getColumns(null, null, tableName.toLowerCase(), columnName.toLowerCase())) {
                        return columns.next();
                    }
                }
            } catch (Exception e2) {
                log.warn("Erro ao verificar coluna: " + e2.getMessage());
                return false;
            }
        }
    }
}

