package com.example.wallet_service.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "wallets")
@Getter
@Setter
@NoArgsConstructor
public class Wallet {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(nullable = false, unique = true)
    private String userId; // ID do usuário vindo do JWT
    
    @Column(nullable = false)
    private Double balance = 0.0;
    
    @Column(nullable = false)
    private String currency = "BRL";
    
    public Wallet(String userId) {
        this.userId = userId;
        this.balance = 0.0;
        this.currency = "BRL";
    }
}

