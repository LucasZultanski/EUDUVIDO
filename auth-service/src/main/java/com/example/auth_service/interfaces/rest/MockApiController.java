package com.example.auth_service.interfaces.rest;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class MockApiController {

    // Dashboard
    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard() {
        return ResponseEntity.ok(Map.of(
            "activeChallenges", 0,
            "completedChallenges", 0,
            "totalEarned", 0.0,
            "totalSpent", 0.0
        ));
    }

    // Challenges - Removidos: endpoints devem ser tratados pelo challenge-service (porta 8082)
    // O proxy do Vite redireciona /api/challenges para o challenge-service

    // Wallet - Removidos: endpoints devem ser tratados pelo wallet-service (porta 8083)
    // O proxy do Vite redireciona /api/wallet para o wallet-service

    // Friends
    @GetMapping("/friends")
    public ResponseEntity<?> getFriends() {
        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/friend-requests/received")
    public ResponseEntity<?> getReceivedRequests() {
        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/friend-requests/sent")
    public ResponseEntity<?> getSentRequests() {
        return ResponseEntity.ok(List.of());
    }

    @PostMapping("/friend-requests")
    public ResponseEntity<?> sendFriendRequest(@RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(Map.of("message", "Solicitação de amizade enviada"));
    }

    @PostMapping("/friend-requests/{id}/accept")
    public ResponseEntity<?> acceptFriendRequest(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of("message", "Solicitação aceita"));
    }

    @PostMapping("/friend-requests/{id}/reject")
    public ResponseEntity<?> rejectFriendRequest(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of("message", "Solicitação rejeitada"));
    }

    // Proofs (REMOVIDO para não conflitar com proof-service)
}
