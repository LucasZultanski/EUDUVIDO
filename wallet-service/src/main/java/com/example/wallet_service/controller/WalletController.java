package com.example.wallet_service.controller;

import com.auth0.jwt.JWT;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.example.wallet_service.entity.Transaction;
import com.example.wallet_service.entity.Wallet;
import com.example.wallet_service.repository.TransactionRepository;
import com.example.wallet_service.repository.WalletRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/wallet")
@CrossOrigin(origins = "*")
public class WalletController {

    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;

    public WalletController(WalletRepository walletRepository, TransactionRepository transactionRepository) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
    }

    private String extractUserId(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                DecodedJWT jwt = JWT.decode(token);
                return jwt.getSubject(); // O subject contém o ID do usuário
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }

    private Wallet getOrCreateWallet(String userId) {
        return walletRepository.findByUserId(userId)
                .orElseGet(() -> {
                    Wallet wallet = new Wallet(userId);
                    return walletRepository.save(wallet);
                });
    }

    @GetMapping
    public ResponseEntity<?> getWallet(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Token não fornecido ou inválido"));
        }
        
        Wallet wallet = getOrCreateWallet(userId);
        return ResponseEntity.ok(Map.of(
            "balance", wallet.getBalance(),
            "currency", wallet.getCurrency()
        ));
    }

    @GetMapping("/transactions")
    public ResponseEntity<?> getTransactions(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Token não fornecido ou inválido"));
        }
        
        List<Transaction> transactions = transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
        
        List<Map<String, Object>> result = transactions.stream().map(tx -> {
            Map<String, Object> txMap = new HashMap<>();
            txMap.put("id", tx.getId().toString());
            txMap.put("userId", tx.getUserId());
            txMap.put("type", tx.getType().name());
            txMap.put("amount", tx.getAmount());
            txMap.put("balance", tx.getBalanceAfter());
            txMap.put("description", tx.getDescription());
            txMap.put("challengeId", tx.getChallengeId());
            txMap.put("createdAt", tx.getCreatedAt().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli());
            return txMap;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    @PostMapping("/deposit")
    @Transactional
    public ResponseEntity<?> deposit(
            @RequestBody Map<String, Object> request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Token não fornecido ou inválido"));
        }
        
        Double amount = ((Number) request.get("amount")).doubleValue();
        if (amount <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Valor deve ser maior que zero"));
        }
        
        Wallet wallet = getOrCreateWallet(userId);
        Double currentBalance = wallet.getBalance();
        Double newBalance = currentBalance + amount;
        wallet.setBalance(newBalance);
        walletRepository.save(wallet);
        
        // Registrar transação
        Transaction transaction = new Transaction();
        transaction.setWallet(wallet);
        transaction.setUserId(userId);
        transaction.setType(Transaction.TransactionType.WALLET_DEPOSIT);
        transaction.setAmount(amount);
        transaction.setBalanceAfter(newBalance);
        // NOVO: usar descrição opcional enviada (ex.: "Reembolso ...")
        String desc = (String) request.getOrDefault("description", "Depósito realizado");
        transaction.setDescription(desc);
        // NOVO: aceitar challengeId opcional (paridade com /debit)
        Object challengeIdObj = request.get("challengeId");
        if (challengeIdObj != null) {
            if (challengeIdObj instanceof Number) {
                transaction.setChallengeId(((Number) challengeIdObj).longValue());
            } else if (challengeIdObj instanceof String) {
                try {
                    transaction.setChallengeId(Long.parseLong((String) challengeIdObj));
                } catch (NumberFormatException ignored) {}
            }
        }
        // createdAt será definido pelo @PrePersist
        transactionRepository.save(transaction);
        
        return ResponseEntity.ok(Map.of(
            "message", "Depósito realizado com sucesso",
            "amount", amount,
            "balance", newBalance
        ));
    }

    // Endpoint para debitar saldo (usado pelo challenge-service)
    @PostMapping("/debit")
    @Transactional
    public ResponseEntity<?> debit(
            @RequestBody Map<String, Object> request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Token não fornecido ou inválido"));
        }
        
        Double amount = ((Number) request.get("amount")).doubleValue();
        if (amount <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Valor deve ser maior que zero"));
        }
        
        Wallet wallet = getOrCreateWallet(userId);
        Double currentBalance = wallet.getBalance();
        if (currentBalance < amount) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Saldo insuficiente",
                "currentBalance", currentBalance,
                "requiredAmount", amount
            ));
        }
        
        Double newBalance = currentBalance - amount;
        wallet.setBalance(newBalance);
        walletRepository.save(wallet);
        
        // Registrar transação
        Transaction transaction = new Transaction();
        transaction.setWallet(wallet);
        transaction.setUserId(userId);
        transaction.setType(Transaction.TransactionType.DEBIT);
        transaction.setAmount(amount);
        transaction.setBalanceAfter(newBalance);
        transaction.setDescription((String) request.getOrDefault("description", "Pagamento de desafio"));
        Object challengeIdObj = request.get("challengeId");
        if (challengeIdObj != null) {
            if (challengeIdObj instanceof Number) {
                transaction.setChallengeId(((Number) challengeIdObj).longValue());
            } else if (challengeIdObj instanceof String) {
                try {
                    transaction.setChallengeId(Long.parseLong((String) challengeIdObj));
                } catch (NumberFormatException e) {
                    // Ignora se não for um número válido
                }
            }
        }
        // createdAt será definido pelo @PrePersist
        transactionRepository.save(transaction);
        
        return ResponseEntity.ok(Map.of(
            "message", "Débito realizado com sucesso",
            "amount", amount,
            "balance", newBalance
        ));
    }
}
