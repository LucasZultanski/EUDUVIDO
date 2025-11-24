package com.example.wallet_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "transactions")
@Getter
@Setter
@NoArgsConstructor
public class Transaction {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wallet_id", nullable = false)
    private Wallet wallet;
    
    @Column(nullable = false)
    private String userId; // ID do usuário para facilitar consultas
    
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private TransactionType type;
    
    @Column(nullable = false)
    private Double amount;
    
    @Column(nullable = false)
    private Double balanceAfter; // Saldo após a transação
    
    @Column(length = 500)
    private String description;
    
    private Long challengeId; // ID do desafio relacionado (se aplicável)
    
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
    
    public enum TransactionType {
        WALLET_DEPOSIT,
        DEBIT
    }
}

