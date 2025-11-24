package com.example.friend_service.controller;

import com.auth0.jwt.JWT;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.example.friend_service.entity.FriendRequest;
import com.example.friend_service.entity.Friendship;
import com.example.friend_service.repository.FriendRequestRepository;
import com.example.friend_service.repository.FriendshipRepository;
import com.example.friend_service.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.util.Locale; // NOVO

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:3000", methods = {RequestMethod.GET,RequestMethod.POST,RequestMethod.PATCH,RequestMethod.DELETE,RequestMethod.OPTIONS})
public class FriendController {

    private final FriendRequestRepository friendRequestRepository;
    private final FriendshipRepository friendshipRepository;
    private final UserService userService;

    public FriendController(
            FriendRequestRepository friendRequestRepository,
            FriendshipRepository friendshipRepository,
            UserService userService) {
        this.friendRequestRepository = friendRequestRepository;
        this.friendshipRepository = friendshipRepository;
        this.userService = userService;
    }

    private String extractUserId(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                DecodedJWT jwt = JWT.decode(token);
                return jwt.getSubject();
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }

    private String normalizeId(String value) { // NOVO
        return value == null ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    @GetMapping("/friends")
    public ResponseEntity<?> getFriends(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String userId = extractUserId(authHeader);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Token inválido ou não fornecido"));
            }

            List<Friendship> friendships = friendshipRepository.findByUserId(userId);
            List<Map<String, Object>> friends = new ArrayList<>();

            for (Friendship friendship : friendships) {
                String friendId = friendship.getUser1Id().equals(userId) 
                    ? friendship.getUser2Id() 
                    : friendship.getUser1Id();
                
                Map<String, Object> userInfo = userService.getUserById(friendId, authHeader);
                if (userInfo != null) {
                    friends.add(userInfo);
                }
            }

            return ResponseEntity.ok(friends);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Erro ao buscar amigos: " + e.getMessage()));
        }
    }

    @GetMapping("/friend-requests/received")
    public ResponseEntity<?> getReceivedRequests(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String userId = extractUserId(authHeader);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Token inválido ou não fornecido"));
            }

            List<FriendRequest> requests = friendRequestRepository.findByReceiverIdAndStatus(
                userId, 
                FriendRequest.RequestStatus.PENDING
            );

            List<Map<String, Object>> result = requests.stream()
                .map(request -> {
                    Map<String, Object> senderInfo = userService.getUserById(request.getSenderId(), authHeader);
                    if (senderInfo == null) {
                        senderInfo = new HashMap<>();
                        senderInfo.put("id", request.getSenderId());
                        senderInfo.put("username", "Usuário não encontrado");
                        senderInfo.put("email", "");
                        senderInfo.put("profilePicture", "");
                    }
                    
                    Map<String, Object> requestMap = new HashMap<>();
                    requestMap.put("id", request.getId().toString());
                    requestMap.put("sender", senderInfo);
                    requestMap.put("createdAt", request.getCreatedAt().toString());
                    requestMap.put("rawSenderId", request.getSenderId()); // DEBUG
                    requestMap.put("rawReceiverId", request.getReceiverId()); // DEBUG
                    return requestMap;
                })
                .collect(Collectors.toList());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Erro ao buscar pedidos recebidos: " + e.getMessage()));
        }
    }

    @GetMapping("/friend-requests/sent")
    public ResponseEntity<?> getSentRequests(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String userId = extractUserId(authHeader);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Token inválido ou não fornecido"));
            }

            List<FriendRequest> requests = friendRequestRepository.findBySenderIdAndStatus(
                userId, 
                FriendRequest.RequestStatus.PENDING
            );

            List<Map<String, Object>> result = requests.stream()
                .map(request -> {
                    Map<String, Object> receiverInfo = userService.getUserById(request.getReceiverId(), authHeader);
                    if (receiverInfo == null) {
                        receiverInfo = new HashMap<>();
                        receiverInfo.put("id", request.getReceiverId());
                        receiverInfo.put("username", "Usuário não encontrado");
                        receiverInfo.put("email", "");
                        receiverInfo.put("profilePicture", "");
                    }
                    
                    Map<String, Object> requestMap = new HashMap<>();
                    requestMap.put("id", request.getId().toString());
                    requestMap.put("receiver", receiverInfo);
                    requestMap.put("createdAt", request.getCreatedAt().toString());
                    requestMap.put("rawSenderId", request.getSenderId()); // DEBUG
                    requestMap.put("rawReceiverId", request.getReceiverId()); // DEBUG
                    return requestMap;
                })
                .collect(Collectors.toList());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Erro ao buscar pedidos enviados: " + e.getMessage()));
        }
    }

    @PostMapping("/friend-requests")
    public ResponseEntity<?> sendFriendRequest(
            @RequestBody Map<String, Object> request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String senderId = extractUserId(authHeader);
            if (senderId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Token inválido ou não fornecido"));
            }

            String username = (String) request.get("username");
            if (username == null || username.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Nome de usuário é obrigatório"));
            }

            // Buscar usuário pelo username
            Map<String, Object> receiverInfo = userService.getUserByUsername(username.trim(), authHeader);
            if (receiverInfo == null) {
                return ResponseEntity.status(404).body(Map.of("error", "Usuário não encontrado"));
            }

            String receiverId = (String) receiverInfo.get("id");
            
            // Não pode enviar pedido para si mesmo
            if (senderId.equals(receiverId)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Você não pode enviar pedido de amizade para si mesmo"));
            }

            // Verificar se já são amigos
            if (friendshipRepository.existsFriendship(senderId, receiverId)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Você já é amigo deste usuário"));
            }

            // Verificar se já existe pedido pendente (em qualquer direção)
            boolean hasPendingRequest = friendRequestRepository.existsBySenderIdAndReceiverIdAndStatus(
                senderId, receiverId, FriendRequest.RequestStatus.PENDING
            ) || friendRequestRepository.existsBySenderIdAndReceiverIdAndStatus(
                receiverId, senderId, FriendRequest.RequestStatus.PENDING
            );

            if (hasPendingRequest) {
                return ResponseEntity.badRequest().body(Map.of("error", "Já existe um pedido de amizade pendente com este usuário"));
            }

            // Criar novo pedido
            FriendRequest friendRequest = new FriendRequest();
            friendRequest.setSenderId(senderId);
            friendRequest.setReceiverId(receiverId);
            friendRequest.setStatus(FriendRequest.RequestStatus.PENDING);
            friendRequestRepository.save(friendRequest);

            return ResponseEntity.ok(Map.of("message", "Pedido de amizade enviado com sucesso"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Erro ao enviar pedido: " + e.getMessage()));
        }
    }

    @PatchMapping("/friend-requests/{id}")
    @Transactional
    public ResponseEntity<?> respondToFriendRequest(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, Object> request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String userId = extractUserId(authHeader);
            if (userId == null) return ResponseEntity.status(401).body(Map.of("error", "Token inválido ou não fornecido"));
            UUID requestId;
            try { requestId = UUID.fromString(id); } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "ID do pedido inválido"));
            }
            Optional<FriendRequest> friendRequestOpt = friendRequestRepository.findById(requestId);
            if (friendRequestOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Pedido de amizade não encontrado"));
            FriendRequest fr = friendRequestOpt.get();
            if (fr.getStatus() != FriendRequest.RequestStatus.PENDING)
                return ResponseEntity.badRequest().body(Map.of("error", "Este pedido já foi respondido"));

            String normalizedUserId = normalizeId(userId);
            String senderNormalized = normalizeId(fr.getSenderId());
            String receiverNormalized = normalizeId(fr.getReceiverId());
            boolean isSender = Objects.equals(senderNormalized, normalizedUserId);
            boolean isReceiver = Objects.equals(receiverNormalized, normalizedUserId);

            String action = request == null ? null : (String) request.get("action");
            if (action == null) {
                if (isSender) action = "cancel";
                else return ResponseEntity.badRequest().body(Map.of("error", "Ação obrigatória"));
            }
            action = action.trim().toLowerCase();
            System.out.println("[FRIEND_REQUEST][PATCH] id=" + id + " action=" + action +
                    " user=" + userId + " sender=" + fr.getSenderId() + " receiver=" + fr.getReceiverId());

            if (action.equals("accept") || action.equals("reject")) {
                if (!isReceiver)
                    return ResponseEntity.status(403).body(Map.of("error", "Apenas o destinatário pode aceitar ou rejeitar este pedido"));
            } else if (action.equals("cancel")) {
                if (!isSender)
                    return ResponseEntity.status(403).body(Map.of("error", "Apenas quem enviou pode cancelar este pedido"));
            } else {
                return ResponseEntity.badRequest().body(Map.of("error", "Ação inválida. Use 'accept', 'reject' ou 'cancel'"));
            }

            fr.setRespondedAt(LocalDateTime.now());
            if (action.equals("accept")) {
                fr.setStatus(FriendRequest.RequestStatus.ACCEPTED);
                friendRequestRepository.save(fr);
                Friendship fs = new Friendship();
                fs.setUser1Id(fr.getSenderId());
                fs.setUser2Id(fr.getReceiverId());
                friendshipRepository.save(fs);
                return ResponseEntity.ok(Map.of("message", "Pedido de amizade aceito"));
            } else {
                fr.setStatus(FriendRequest.RequestStatus.REJECTED);
                friendRequestRepository.save(fr);
                return ResponseEntity.ok(Map.of("message", action.equals("cancel") ? "Pedido de amizade cancelado" : "Pedido de amizade rejeitado"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Erro ao responder pedido: " + e.getMessage()));
        }
    }

    @PostMapping("/friend-requests/{id}/cancel")
    @Transactional
    public ResponseEntity<?> cancelFriendRequestExplicit(
            @PathVariable String id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String userId = extractUserId(authHeader);
            if (userId == null) return ResponseEntity.status(401).body(Map.of("error", "Token inválido"));
            UUID requestId;
            try { requestId = UUID.fromString(id); } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "ID inválido"));
            }
            String normalizedUserId = normalizeId(userId);
            var opt = friendRequestRepository.findById(requestId);
            if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Pedido não encontrado"));
            FriendRequest fr = opt.get();
            if (!Objects.equals(normalizeId(fr.getSenderId()), normalizedUserId))
                return ResponseEntity.status(403).body(Map.of("error", "Você não é o remetente deste pedido"));
            if (fr.getStatus() != FriendRequest.RequestStatus.PENDING)
                return ResponseEntity.badRequest().body(Map.of("error", "Pedido já respondido (" + fr.getStatus() + ")"));
            fr.setStatus(FriendRequest.RequestStatus.REJECTED);
            fr.setRespondedAt(LocalDateTime.now());
            friendRequestRepository.save(fr);
            System.out.println("[FRIEND_REQUEST][POST-CANCEL] id=" + fr.getId() + " sender=" + fr.getSenderId() + " cancelado");
            return ResponseEntity.ok(Map.of("message", "Pedido de amizade cancelado"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Erro ao cancelar: " + e.getMessage()));
        }
    }

    @DeleteMapping("/friends/{friendId}")
    @Transactional
    public ResponseEntity<?> removeFriend(
            @PathVariable String friendId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String userId = extractUserId(authHeader);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Token inválido ou não fornecido"));
            }
            if (friendId == null || friendId.trim().isEmpty() || userId.equals(friendId)) {
                return ResponseEntity.badRequest().body(Map.of("error", "ID do amigo inválido"));
            }

            // Buscar amizade envolvendo o usuário autenticado
            List<Friendship> friendships = friendshipRepository.findByUserId(userId);
            Optional<Friendship> toDelete = friendships.stream().filter(fs ->
                    (userId.equals(fs.getUser1Id()) && friendId.equals(fs.getUser2Id())) ||
                    (userId.equals(fs.getUser2Id()) && friendId.equals(fs.getUser1Id()))
            ).findFirst();

            if (toDelete.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Amizade não encontrada"));
            }

            friendshipRepository.delete(toDelete.get());
            return ResponseEntity.ok(Map.of("message", "Amigo removido com sucesso"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Erro ao remover amigo: " + e.getMessage()));
        }
    }

    @DeleteMapping("/friend-requests/{id}")
    @Transactional
    public ResponseEntity<?> cancelFriendRequest(
            @PathVariable String id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String userId = extractUserId(authHeader);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Token inválido ou não fornecido"));
            }
            UUID requestId;
            try {
                requestId = UUID.fromString(id.trim());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "ID do pedido inválido"));
            }
            Optional<FriendRequest> opt = friendRequestRepository.findById(requestId);
            if (opt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Pedido de amizade não encontrado"));
            }
            FriendRequest fr = opt.get();
            if (!Objects.equals(normalizeId(fr.getSenderId()), normalizeId(userId))) {
                return ResponseEntity.status(403).body(Map.of("error", "Você só pode cancelar pedidos que enviou"));
            }
            if (fr.getStatus() != FriendRequest.RequestStatus.PENDING) {
                return ResponseEntity.badRequest().body(Map.of("error", "Só é possível cancelar pedidos pendentes"));
            }
            friendRequestRepository.delete(fr);
            System.out.println("[FRIEND_REQUEST][DELETE-CANCEL] id=" + fr.getId() + " sender=" + fr.getSenderId() + " deletado");
            return ResponseEntity.ok(Map.of("message", "Pedido de amizade cancelado"));
        } catch (Exception e) {
            System.err.println("[ERRO] Cancelar pedido: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Erro ao cancelar pedido: " + e.getMessage()));
        }
    }
}
