package com.example.challenge_service.controller;

import com.auth0.jwt.JWT;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.example.challenge_service.model.Challenge;
import com.example.challenge_service.model.WinnerVote;
import com.example.challenge_service.model.ChallengeInvite;
import com.example.challenge_service.model.ChallengeInvite.InviteStatus;
import com.example.challenge_service.repository.ChallengeRepository;
import com.example.challenge_service.repository.WinnerVoteRepository;
import com.example.challenge_service.repository.ChallengeInviteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ChallengeController {

    // Armazenamento permanente em banco de dados H2
    // Uma vez criado, o desafio fica vinculado ao usuário para sempre
    @Autowired
    private ChallengeRepository challengeRepository;
    
    @Autowired
    private WinnerVoteRepository winnerVoteRepository;
    
    @Autowired
    private ChallengeInviteRepository challengeInviteRepository;
    
    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String userId = extractUserId(authHeader);
        
        // Filtrar TODOS os desafios do usuário atual (criados ou aceitos)
        // Uma vez criado, o desafio fica vinculado ao usuário para sempre
        List<Challenge> userChallengesList = challengeRepository.findByCreatorIdOrAcceptorId(userId, userId);
        List<Map<String, Object>> userChallenges = userChallengesList.stream()
            .map(Challenge::toMap)
            .collect(Collectors.toList());
        
        long active = userChallenges.stream()
            .filter(c -> "IN_PROGRESS".equals(c.get("status")) || "ACCEPTED".equals(c.get("status")))
            .count();
        long completed = userChallenges.stream()
            .filter(c -> "COMPLETED".equals(c.get("status")))
            .count();
        
        double totalSpent = userChallenges.stream()
            .filter(c -> {
                String status = (String) c.getOrDefault("status", "");
                // Contar apenas desafios pagos (não aguardando pagamento)
                return !"AWAITING_PAYMENT".equals(status) && !"PENDING".equals(status);
            })
            .mapToDouble(c -> ((Number) c.getOrDefault("amount", 0)).doubleValue())
            .sum();
        
        return ResponseEntity.ok(Map.of(
            "activeChallenges", active,
            "completedChallenges", completed,
            "totalEarned", 0.0,
            "totalSpent", totalSpent,
            "challenges", userChallenges
        ));
    }

    @GetMapping("/challenges")
    public ResponseEntity<?> getAllChallenges(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String userId = extractUserId(authHeader);
        
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Token não fornecido ou inválido"));
        }
        
        // Buscar desafios criados pelo usuário
        List<Challenge> createdChallenges = challengeRepository.findByCreatorId(userId);
        
        // Buscar desafios onde o usuário é aceitador
        List<Challenge> acceptedChallenges = challengeRepository.findByAcceptorId(userId);
        
        // Buscar desafios onde o usuário é participante (na lista de participants)
        List<Challenge> participantChallenges = challengeRepository.findByParticipantsContaining(userId);
        
        // Combinar desafios onde o usuário foi convidado (aceitador + participantes)
        Set<Long> createdIds = createdChallenges.stream().map(Challenge::getId).collect(Collectors.toSet());
        List<Challenge> invitedChallenges = new ArrayList<>();
        
        // Adicionar desafios aceitos que não foram criados pelo usuário
        for (Challenge challenge : acceptedChallenges) {
            if (!createdIds.contains(challenge.getId())) {
                invitedChallenges.add(challenge);
            }
        }
        
        // Adicionar desafios onde é participante que não foram criados pelo usuário
        for (Challenge challenge : participantChallenges) {
            if (!createdIds.contains(challenge.getId()) && 
                (challenge.getAcceptorId() == null || !challenge.getAcceptorId().equals(userId))) {
                invitedChallenges.add(challenge);
            }
        }
        
        // Converter para Map e separar
        List<Map<String, Object>> created = createdChallenges.stream()
            .map(ch -> {
                Map<String, Object> m = ch.toMap();
                m.put("winnerId", ch.getWinnerId());
                return m;
            })
            .sorted((a, b) -> {
                Long dateA = (Long) a.getOrDefault("createdAt", 0L);
                Long dateB = (Long) b.getOrDefault("createdAt", 0L);
                return dateB.compareTo(dateA);
            })
            .collect(Collectors.toList());
        
        List<Map<String, Object>> invited = invitedChallenges.stream()
            .map(ch -> {
                Map<String, Object> m = ch.toMap();
                m.put("winnerId", ch.getWinnerId());
                return m;
            })
            .sorted((a, b) -> {
                Long dateA = (Long) a.getOrDefault("createdAt", 0L);
                Long dateB = (Long) b.getOrDefault("createdAt", 0L);
                return dateB.compareTo(dateA);
            })
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(Map.of(
            "created", created,
            "invited", invited
        ));
    }

    @GetMapping("/challenges/{id}")
    public ResponseEntity<?> getChallengeById(@PathVariable String id) {
        try {
            System.out.println("GET /api/challenges/" + id + " - Buscando desafio...");
            Long challengeId = Long.parseLong(id);
            Optional<Challenge> challengeOpt = challengeRepository.findById(challengeId);
            if (challengeOpt.isEmpty()) {
                System.out.println("Desafio com ID " + challengeId + " não encontrado no banco de dados");
                return ResponseEntity.status(404).body(Map.of("error", "Desafio não encontrado", "id", id));
            }
            Challenge challenge = challengeOpt.get();
            Map<String, Object> map = challenge.toMap();
            map.put("winnerId", challenge.getWinnerId());
            System.out.println("Desafio encontrado: ID=" + challenge.getId() + ", Status=" + challenge.getStatus());
            return ResponseEntity.ok(map);
        } catch (NumberFormatException e) {
            System.err.println("Erro ao parsear ID do desafio: " + id + " - " + e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "ID inválido: " + id));
        } catch (Exception e) {
            System.err.println("Erro inesperado ao buscar desafio: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Erro ao buscar desafio: " + e.getMessage()));
        }
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

    // Endpoint para preparar criação de desafio (não cria ainda, apenas valida e retorna dados)
    @PostMapping("/challenges/prepare")
    public ResponseEntity<?> prepareChallenge(
            @RequestBody Map<String, Object> challengeData,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            // Validação básica dos campos obrigatórios
            if (challengeData == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Dados do desafio não fornecidos"));
            }
            
            if (challengeData.get("description") == null || challengeData.get("description").toString().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Descrição do desafio é obrigatória"));
            }
            
            if (challengeData.get("amount") == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Valor da aposta é obrigatório"));
            }
            
            String userId = extractUserId(authHeader);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Token não fornecido ou inválido"));
            }
            
            // Retorna os dados do desafio para o frontend processar o pagamento
            // O desafio só será criado após o pagamento ser confirmado
            Map<String, Object> challengePreview = new HashMap<>();
            challengePreview.put("description", challengeData.get("description"));
            challengePreview.put("amount", challengeData.get("amount"));
            challengePreview.put("type", challengeData.getOrDefault("type", "custom"));
            challengePreview.put("icon", challengeData.getOrDefault("icon", null));
            challengePreview.put("minWorkoutMinutes", challengeData.getOrDefault("minWorkoutMinutes", null));
            challengePreview.put("customProofTypes", challengeData.getOrDefault("customProofTypes", null));
            challengePreview.put("duration", challengeData.getOrDefault("duration", null));
            challengePreview.put("allowGuests", challengeData.getOrDefault("allowGuests", true));
            challengePreview.put("proofsPerDay", challengeData.getOrDefault("proofsPerDay", null));
            // NOVO: refeições por dia (para dieta)
            challengePreview.put("mealsPerDay", challengeData.getOrDefault("mealsPerDay", null));
            challengePreview.put("minMealIntervalMinutes", challengeData.getOrDefault("minMealIntervalMinutes", null)); // NOVO
            challengePreview.put("creatorId", userId);
            
            return ResponseEntity.ok(challengePreview);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Erro ao preparar desafio: " + e.getMessage()));
        }
    }

    // Endpoint para criar desafio após pagamento confirmado
    @PostMapping("/challenges/create")
    public ResponseEntity<?> createChallengeAfterPayment(
            @RequestBody Map<String, Object> challengeData,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String userId = extractUserId(authHeader);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Token não fornecido ou inválido"));
            }
            // NOVO: detectar se criador participa
            boolean creatorParticipates = true;
            Object cpObj = challengeData.get("creatorParticipates");
            if (cpObj instanceof Boolean) creatorParticipates = (Boolean) cpObj;

            Double amount = ((Number) challengeData.get("amount")).doubleValue();

            if (creatorParticipates) {
                // Verificar se o pagamento foi feito (chamando wallet-service)
                try {
                    String url = "http://localhost:8083/api/wallet/debit";
                    Map<String, Object> debitRequest = new HashMap<>();
                    debitRequest.put("amount", amount);
                    debitRequest.put("description", "Pagamento para criar desafio: " + challengeData.get("description"));
                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(MediaType.APPLICATION_JSON);
                    headers.set("Authorization", authHeader);
                    HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(debitRequest, headers);
                    ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                        url, HttpMethod.POST, requestEntity, 
                        new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {});
                    if (!response.getStatusCode().is2xxSuccessful()) {
                        return ResponseEntity.badRequest().body(Map.of("error", "Não foi possível debitar o saldo. Verifique se você tem saldo suficiente."));
                    }
                } catch (org.springframework.web.client.HttpClientErrorException e) {
                    try {
                        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                        Map<String, Object> errorResponse = mapper.readValue(e.getResponseBodyAsString(), Map.class);
                        return ResponseEntity.status(e.getStatusCode()).body(errorResponse);
                    } catch (Exception ex) {
                        return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getResponseBodyAsString()));
                    }
                } catch (Exception e) {
                    return ResponseEntity.status(500).body(Map.of("error", "Erro ao processar pagamento: " + e.getMessage()));
                }
            }

            // Criar desafio
            Challenge challenge = Challenge.fromMap(challengeData);
            challenge.setCreatorParticipates(creatorParticipates);
            challenge.setStatus(creatorParticipates ? "NOT_STARTED" : "NOT_STARTED"); // inicia como NOT_STARTED
            challenge.setCreatedAt(System.currentTimeMillis());
            challenge.setCreatorId(userId);
            challenge.setAcceptorId(null);
            challenge.setPaid(Boolean.TRUE.equals(creatorParticipates)); // pago apenas se o criador pagou neste fluxo
            challenge.setStartDate(null);
            challenge.setEndDate(null);
            challenge.setPaidUserIds(new ArrayList<>());
            if (creatorParticipates) {
                challenge.getPaidUserIds().add(userId);
            }
            if (challenge.getParticipationFeePercent() == null) {
                challenge.setParticipationFeePercent(15.0);
            }
            double participationFee = (challenge.getAmount() * (challenge.getParticipationFeePercent() / 100.0));
            double netStakePerUser = challenge.getAmount() - participationFee;
            String shareLink = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
            challenge.setShareLink(shareLink);
            if (challenge.getInvitePermission() == null) {
                challenge.setInvitePermission("CREATOR_ONLY");
            }
            if (challenge.getParticipants() == null) {
                challenge.setParticipants(new ArrayList<>());
            }
            Challenge savedChallenge = challengeRepository.save(challenge);
            return ResponseEntity.ok(new HashMap<String, Object>() {{
                putAll(savedChallenge.toMap());
                put("participationFeePercent", savedChallenge.getParticipationFeePercent());
                put("participationFee", participationFee);
                put("netStakePerUser", netStakePerUser);
            }});
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Erro ao criar desafio: " + e.getMessage()));
        }
    }

    // Endpoint para criar desafio sem pagamento (status AWAITING_PAYMENT)
    @PostMapping("/challenges/create-without-payment")
    public ResponseEntity<?> createChallengeWithoutPayment(
            @RequestBody Map<String, Object> challengeData,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String userId = extractUserId(authHeader);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Token não fornecido ou inválido"));
            }
            Challenge challenge = Challenge.fromMap(challengeData);
            // NOVO: criador pode escolher participar
            boolean creatorParticipates = true;
            Object cpObj = challengeData.get("creatorParticipates");
            if (cpObj instanceof Boolean) creatorParticipates = (Boolean) cpObj;

            challenge.setCreatorParticipates(creatorParticipates);
            challenge.setStatus(creatorParticipates ? "AWAITING_PAYMENT" : "NOT_STARTED");
            challenge.setCreatedAt(System.currentTimeMillis());
            challenge.setCreatorId(userId);
            challenge.setAcceptorId(null);
            challenge.setPaid(false);
            challenge.setStartDate(null);
            challenge.setEndDate(null);
            String shareLink = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
            challenge.setShareLink(shareLink);
            if (challenge.getInvitePermission() == null) {
                challenge.setInvitePermission("CREATOR_ONLY");
            }
            if (challenge.getParticipants() == null) {
                challenge.setParticipants(new ArrayList<>());
            }
            challenge.setPaidUserIds(new ArrayList<>());
            Challenge savedChallenge = challengeRepository.save(challenge);
            return ResponseEntity.ok(savedChallenge.toMap());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Erro ao criar desafio: " + e.getMessage()));
        }
    }
    
    // Mantém endpoint antigo para compatibilidade, mas agora apenas prepara
    @PostMapping("/challenges")
    public ResponseEntity<?> createChallenge(
            @RequestBody Map<String, Object> challengeData,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // Redireciona para o endpoint de preparação
        return prepareChallenge(challengeData, authHeader);
    }

    @PostMapping("/challenges/{id}/accept")
    public ResponseEntity<?> acceptChallenge(
            @PathVariable String id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String userId = extractUserId(authHeader);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Token não fornecido ou inválido"));
            }
            Long challengeId = Long.parseLong(id);
            Optional<Challenge> challengeOpt = challengeRepository.findById(challengeId);
            if (challengeOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            Challenge challenge = challengeOpt.get();

            // Não iniciar ainda: todos devem pagar
            challenge.setAcceptorId(userId);
            if (challenge.getPaidUserIds() == null) {
                challenge.setPaidUserIds(new ArrayList<>());
            }
            challenge.setStatus("NOT_STARTED"); // aguarda início manual do criador
            // REMOVIDO: bloco que iniciava se allParticipantsHavePaid
            Challenge savedChallenge = challengeRepository.save(challenge);
            return ResponseEntity.ok(Map.of("message", "Aceitador adicionado. Pagamento necessário. Apenas o criador pode iniciar.", "challenge", savedChallenge.toMap()));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "ID inválido"));
        }
    }

    private boolean allParticipantsHavePaid(Challenge c) {
        List<String> paid = c.getPaidUserIds() != null ? c.getPaidUserIds() : List.of();
        List<String> required = new ArrayList<>();
        if (Boolean.TRUE.equals(c.getCreatorParticipates()) && c.getCreatorId() != null) {
            required.add(c.getCreatorId());
        }
        if (c.getAcceptorId() != null) required.add(c.getAcceptorId());
        if (c.getParticipants() != null) required.addAll(c.getParticipants());
        required = required.stream().distinct().collect(Collectors.toList());
        // Agora exige mínimo de 2 participantes pagos
        return required.size() >= 2 && paid.containsAll(required);
    }

    @PostMapping("/challenges/{id}/pay")
    public ResponseEntity<?> payChallenge(
            @PathVariable String id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String userId = extractUserId(authHeader);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Token não fornecido ou inválido"));
            }
            Long challengeId = Long.parseLong(id);
            Optional<Challenge> challengeOpt = challengeRepository.findById(challengeId);
            if (challengeOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            Challenge challenge = challengeOpt.get();

            // Permitir pagar se:
            // - status AWAITING_PAYMENT (criador) OU
            // - status NOT_STARTED e usuário participante ainda não pago
            String status = challenge.getStatus();
            boolean isParticipant = challenge.isUserParticipant(userId);
            if (!"AWAITING_PAYMENT".equals(status) && !("NOT_STARTED".equals(status) && isParticipant)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Pagamento não permitido neste status"));
            }

            if (challenge.getPaidUserIds() == null) {
                challenge.setPaidUserIds(new ArrayList<>());
            }
            if (challenge.getPaidUserIds().contains(userId)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Usuário já pagou este desafio"));
            }

            Double amount = challenge.getAmount();
            try {
                String url = "http://localhost:8083/api/wallet/debit";
                Map<String, Object> debitRequest = new HashMap<>();
                debitRequest.put("amount", amount);
                debitRequest.put("challengeId", challengeId);
                debitRequest.put("description", "Pagamento de desafio (participante)");

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("Authorization", authHeader);

                HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(debitRequest, headers);
                ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                        url, HttpMethod.POST, requestEntity,
                        new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {});
                Map<String, Object> walletResponse = response.getBody();
                if (response.getStatusCode().is2xxSuccessful() && walletResponse != null) {
                    Double newBalance = ((Number) walletResponse.get("balance")).doubleValue();
                    // Marcar pagamento
                    challenge.getPaidUserIds().add(userId);
                    // Se era AWAITING_PAYMENT (criador pagando), marcar paid
                    if ("AWAITING_PAYMENT".equals(status)) {
                        challenge.setPaid(true);
                        challenge.setStatus("NOT_STARTED");
                    }
                    // REMOVIDO: início automático aqui
                    if (challenge.getParticipationFeePercent() == null) {
                        challenge.setParticipationFeePercent(15.0);
                    }
                    double participationFee = (challenge.getAmount() * (challenge.getParticipationFeePercent() / 100.0));
                    double netStakePerUser = challenge.getAmount() - participationFee;
                    Challenge savedChallenge = challengeRepository.save(challenge);
                    return ResponseEntity.ok(Map.of(
                            "message", "Pagamento realizado",
                            "challenge", savedChallenge.toMap(),
                            "walletBalance", newBalance,
                            "participationFeePercent", savedChallenge.getParticipationFeePercent(),
                            "participationFee", participationFee,
                            "netStakePerUser", netStakePerUser
                    ));
                } else {
                    return ResponseEntity.status(500).body(Map.of("error", "Erro ao processar pagamento"));
                }
            } catch (org.springframework.web.client.HttpClientErrorException e) {
                try {
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    Map<String, Object> errorResponse = mapper.readValue(e.getResponseBodyAsString(), Map.class);
                    return ResponseEntity.status(e.getStatusCode()).body(errorResponse);
                } catch (Exception ex) {
                    return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getResponseBodyAsString()));
                }
            } catch (Exception e) {
                return ResponseEntity.status(500).body(Map.of("error", "Erro ao processar pagamento: " + e.getMessage()));
            }
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "ID inválido"));
        }
    }

    @PatchMapping("/challenges/{id}/icon")
    public ResponseEntity<?> updateIcon(
            @PathVariable String id,
            @RequestBody Map<String, Object> data,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String userId = extractUserId(authHeader);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Token não fornecido ou inválido"));
            }
            Long challengeId = Long.parseLong(id);
            Optional<Challenge> challengeOpt = challengeRepository.findById(challengeId);
            if (challengeOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            Challenge challenge = challengeOpt.get();
            if (!Objects.equals(challenge.getCreatorId(), userId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Apenas o criador pode alterar o ícone do desafio"));
            }
            challenge.setIcon((String) data.get("icon"));
            Challenge savedChallenge = challengeRepository.save(challenge);
            return ResponseEntity.ok(savedChallenge.toMap());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "ID inválido"));
        }
    }

    @GetMapping("/challenges/stats")
    public ResponseEntity<?> getUserStats(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            final String userId;
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                try {
                    String token = authHeader.substring(7);
                    DecodedJWT jwt = JWT.decode(token);
                    userId = jwt.getSubject();
                } catch (Exception e) {
                    return ResponseEntity.ok(Map.of("participated", 0, "won", 0));
                }
            } else {
                return ResponseEntity.ok(Map.of("participated", 0, "won", 0));
            }
            List<Challenge> userChallenges = challengeRepository.findByCreatorIdOrAcceptorId(userId, userId);
            long participated = userChallenges.size();
            long won = userChallenges.stream().filter(c -> "COMPLETED".equals(c.getStatus())).count();
            return ResponseEntity.ok(Map.of("participated", participated, "won", won));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Erro ao buscar estatísticas: " + e.getMessage()));
        }
    }
    
    @GetMapping("/challenges/{id}/share-link")
    public ResponseEntity<?> getShareLink(
            @PathVariable String id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String userId = extractUserId(authHeader);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Token não fornecido ou inválido"));
            }
            
            Long challengeId = Long.parseLong(id);
            Optional<Challenge> challengeOpt = challengeRepository.findById(challengeId);
            if (challengeOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            Challenge challenge = challengeOpt.get();
            
            // Verificar se o usuário é participante (criador, aceitador ou participante)
            boolean isParticipant = challenge.getCreatorId().equals(userId) ||
                    (challenge.getAcceptorId() != null && challenge.getAcceptorId().equals(userId)) ||
                    (challenge.getParticipants() != null && challenge.getParticipants().contains(userId));
            
            if (!isParticipant) {
                return ResponseEntity.status(403).body(Map.of("error", "Você não tem permissão para ver este link"));
            }
            
            // Só retornar link se o desafio estiver aberto ou em andamento
            String status = challenge.getStatus();
            if (!"NOT_STARTED".equals(status) && !"IN_PROGRESS".equals(status) && !"ACCEPTED".equals(status)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Link de aposta só está disponível para desafios abertos ou em andamento"));
            }
            // BLOQUEIO: se já está em andamento e não permite novas entradas
            if ("IN_PROGRESS".equals(status) && Boolean.FALSE.equals(challenge.getAllowGuests())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Novos participantes não são permitidos após o início do desafio"));
            }
            
            String baseUrl = "http://localhost:3000"; // TODO: pegar de configuração
            String fullLink = baseUrl + "/desafio/" + challengeId + "/apostar?link=" + challenge.getShareLink();
            return ResponseEntity.ok(Map.of("shareLink", fullLink, "shareCode", challenge.getShareLink()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Erro ao obter link: " + e.getMessage()));
        }
    }
    
    @PostMapping("/challenges/{id}/invite")
    public ResponseEntity<?> inviteFriend(
            @PathVariable String id,
            @RequestBody Map<String, Object> request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String userId = extractUserId(authHeader);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Token não fornecido ou inválido"));
            }
            
            Long challengeId = Long.parseLong(id);
            Optional<Challenge> challengeOpt = challengeRepository.findById(challengeId);
            if (challengeOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            Challenge challenge = challengeOpt.get();
            // BLOQUEIO: se já está em andamento e não permite novas entradas
            if ("IN_PROGRESS".equals(challenge.getStatus()) && Boolean.FALSE.equals(challenge.getAllowGuests())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Convites desativados após o início do desafio"));
            }
            
            // Verificar se o usuário pode convidar (baseado em permissão e limite)
            if (!challenge.canUserInvite(userId)) {
                if (challenge.isInviteLimitReached()) {
                    return ResponseEntity.badRequest().body(Map.of("error", "O limite de participantes foi atingido"));
                } else {
                    return ResponseEntity.status(403).body(Map.of("error", "Você não tem permissão para convidar amigos"));
                }
            }
            
            // Verificar se o desafio está em estado que permite convites
            String status = challenge.getStatus();
            if ("COMPLETED".equals(status)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Não é possível convidar amigos em desafios concluídos"));
            }
            
            String friendId = (String) request.get("friendId");
            if (friendId == null || friendId.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "ID do amigo é obrigatório"));
            }

            // Verificar se está banido
            if (challenge.getBannedUserIds() != null && challenge.getBannedUserIds().contains(friendId)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Este usuário está banido deste desafio"));
            }
            
            // Verificar se o amigo já é participante
            if (challenge.isUserParticipant(friendId)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Este usuário já é participante do desafio"));
            }
            if (challengeInviteRepository.findByChallengeIdAndInviteeIdAndStatus(challengeId, friendId, InviteStatus.PENDING).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Já existe um convite pendente para este usuário"));
            }
            ChallengeInvite invite = new ChallengeInvite();
            invite.setChallengeId(challengeId);
            invite.setInviteeId(friendId);
            invite.setInviterId(userId);
            invite.setStatus(InviteStatus.PENDING);
            invite.setCreatedAt(System.currentTimeMillis());
            challengeInviteRepository.save(invite);

            // NOVO: envio de e-mail ao convidado
            boolean emailSent = false;
            Optional<String> inviteeEmail = fetchUserEmail(friendId, authHeader);
            Optional<String> inviterEmail = fetchUserEmail(userId, authHeader);
            if (inviteeEmail.isPresent()) {
                String subj = "Você foi convidado para um desafio no Eu-Duvido";
                String desc = challenge.getDescription() != null ? challenge.getDescription() : "(sem descrição)";
                String body =
                        "Olá!\n\n" +
                        "Você recebeu um convite para participar do desafio:\n" +
                        desc + "\n\n" +
                        "Valor da aposta: R$ " + String.format(Locale.US, "%.2f", challenge.getAmount()) + "\n" +
                        "Convidado por: " + inviterEmail.orElse("Usuário") + "\n\n" +
                        "Acesse sua área de convites para aceitar.\n\n" +
                        "Sistema Eu-Duvido";
                emailSent = sendEmail(inviteeEmail.get(), subj, body);
            }

            return ResponseEntity.ok(Map.of(
                    "message", "Convite enviado. O amigo precisa aceitar antes de participar.",
                    "emailSent", emailSent
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Erro ao convidar amigo: " + e.getMessage()));
        }
    }

    @PostMapping("/challenges/{id}/start")
    public ResponseEntity<?> startChallenge(@PathVariable String id,
                                            @RequestHeader(value="Authorization",required=false) String authHeader) {
        try {
            String userId = extractUserId(authHeader);
            if (userId == null) return ResponseEntity.status(401).body(Map.of("error","Token inválido"));
            Long challengeId = Long.parseLong(id);
            Challenge c = challengeRepository.findById(challengeId).orElse(null);
            if (c == null) return ResponseEntity.status(404).body(Map.of("error","Desafio não encontrado"));
            if (!Objects.equals(c.getCreatorId(), userId))
                return ResponseEntity.status(403).body(Map.of("error","Somente o criador pode iniciar"));
            if (!"NOT_STARTED".equals(c.getStatus()))
                return ResponseEntity.badRequest().body(Map.of("error","Status inválido para iniciar"));
            List<String> paid = c.getPaidUserIds() == null ? List.of() : c.getPaidUserIds();
            List<String> required = new ArrayList<>();
            if (Boolean.TRUE.equals(c.getCreatorParticipates()) && c.getCreatorId()!=null) required.add(c.getCreatorId());
            if (c.getAcceptorId()!=null) required.add(c.getAcceptorId());
            if (c.getParticipants()!=null) required.addAll(c.getParticipants());
            required = required.stream().distinct().collect(Collectors.toList());
            boolean allPaid = paid.containsAll(required);
            if (!allPaid)
                return ResponseEntity.badRequest().body(Map.of("error","Ainda há participantes sem pagamento"));
            c.setStatus("IN_PROGRESS");
            c.setStartDate(System.currentTimeMillis());
            challengeRepository.save(c);
            return ResponseEntity.ok(Map.of("message","Desafio iniciado","challenge", c.toMap()));
        } catch(Exception e){
            return ResponseEntity.status(500).body(Map.of("error","Falha ao iniciar: "+e.getMessage()));
        }
    }

    @GetMapping("/challenges/{id}/votes")
    public ResponseEntity<?> getVotes(@PathVariable String id) {
        try {
            Long challengeId = Long.parseLong(id);
            Challenge c = challengeRepository.findById(challengeId).orElse(null);
            if (c == null) return ResponseEntity.status(404).body(Map.of("error","Desafio não encontrado"));
            List<WinnerVote> votes = winnerVoteRepository.findByChallengeId(challengeId);
            if (votes == null) votes = new ArrayList<>();
            Map<String, Long> count = new HashMap<>(); // ADICIONADO: inicializar map
            try {
                count = votes.stream()
                        .filter(v -> v != null && v.getVotedForId() != null)
                        .collect(Collectors.groupingBy(WinnerVote::getVotedForId, Collectors.counting()));
            } catch (Exception e) {
                System.err.println("[getVotes][STREAM ERROR] " + e.getMessage());
                count = new HashMap<>(); // fallback vazio
            }
            Set<String> participants = new HashSet<>();
            try {
                if (Boolean.TRUE.equals(c.getCreatorParticipates()) && c.getCreatorId()!=null) participants.add(c.getCreatorId());
                if (c.getAcceptorId()!=null) participants.add(c.getAcceptorId());
                if (c.getParticipants()!=null) participants.addAll(c.getParticipants());
            } catch (Exception e) {
                System.err.println("[getVotes][PARTICIPANTS ERROR] " + e.getMessage());
                participants = new HashSet<>(); // fallback vazio
            }
            int requiredVotes = participants.size();
            String winnerId = c.getWinnerId();

            // Nunca retorna erro 500, sempre retorna objeto seguro
            if (participants.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                    "totalVotes", votes.size(),
                    "requiredVotes", 0,
                    "voteCount", Map.of(),
                    "allParticipants", List.of(),
                    "winnerId", winnerId
                ));
            }

            if ("COMPLETED".equals(c.getStatus()) && votes.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                    "totalVotes", 0,
                    "requiredVotes", requiredVotes,
                    "voteCount", Map.of(),
                    "allParticipants", new ArrayList<>(participants),
                    "winnerId", winnerId
                ));
            }

            // Normal: retorna votos e participantes
            return ResponseEntity.ok(Map.of(
                    "totalVotes", votes.size(),
                    "requiredVotes", requiredVotes,
                    "voteCount", count,
                    "allParticipants", new ArrayList<>(participants),
                    "winnerId", winnerId
            ));
        } catch(Exception e){
            // Nunca retorna erro 500, sempre retorna objeto seguro para o frontend
            System.err.println("Erro ao obter votos: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.ok(Map.of(
                "totalVotes", 0,
                "requiredVotes", 0,
                "voteCount", Map.of(),
                "allParticipants", List.of(),
                "winnerId", null,
                "error", "Falha ao obter votos: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/challenges/{id}/vote-winner")
    public ResponseEntity<?> voteWinner(@PathVariable String id,
                                        @RequestBody Map<String,String> body,
                                        @RequestHeader(value="Authorization",required=false) String authHeader) {
        // REMOVIDO: votação não é mais usada, vencedor automático
        return ResponseEntity.badRequest().body(Map.of("error","Votação desabilitada. Vencedor é automático."));
    }

    @GetMapping("/challenges/{id}/invites")
    public ResponseEntity<?> listInvites(@PathVariable String id) {
        try {
            Long challengeId = Long.parseLong(id);
            List<ChallengeInvite> invites = challengeInviteRepository.findByChallengeId(challengeId);
            return ResponseEntity.ok(invites);
        } catch(Exception e){
            return ResponseEntity.status(500).body(Map.of("error","Falha ao listar convites: "+e.getMessage()));
        }
    }

    @GetMapping("/challenges/invites")
    public ResponseEntity<?> listMyInvites(@RequestHeader(value="Authorization",required=false) String authHeader) {
        try {
            String userId = extractUserId(authHeader);
            if (userId == null) return ResponseEntity.status(401).body(Map.of("error","Token inválido"));
            
            // Buscar todos os convites pendentes para este usuário
            List<ChallengeInvite> invites = challengeInviteRepository.findByInviteeIdAndStatus(userId, InviteStatus.PENDING);
            
            // Enriquecer com dados do desafio
            List<Map<String, Object>> enriched = new ArrayList<>();
            for (ChallengeInvite invite : invites) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", invite.getId());
                item.put("challengeId", invite.getChallengeId());
                item.put("inviterId", invite.getInviterId());
                item.put("inviteeId", invite.getInviteeId());
                item.put("status", invite.getStatus());
                item.put("createdAt", invite.getCreatedAt());
                
                // Buscar dados do desafio
                try {
                    Optional<Challenge> chOpt = challengeRepository.findById(invite.getChallengeId());
                    if (chOpt.isPresent()) {
                        Challenge ch = chOpt.get();
                        Map<String, Object> challengeData = new HashMap<>();
                        challengeData.put("id", ch.getId());
                        challengeData.put("description", ch.getDescription());
                        challengeData.put("amount", ch.getAmount());
                        challengeData.put("type", ch.getType());
                        challengeData.put("status", ch.getStatus());
                        item.put("challenge", challengeData);
                    }
                } catch (Exception ignored) {
                    item.put("challenge", null);
                }
                
                enriched.add(item);
            }
            
            return ResponseEntity.ok(enriched);
        } catch(Exception e){
            return ResponseEntity.status(500).body(Map.of("error","Falha ao listar convites: "+e.getMessage()));
        }
    }

    @PostMapping("/challenges/invites/{inviteId}/respond")
    public ResponseEntity<?> respondToInvite(@PathVariable String inviteId,
                                             @RequestBody Map<String,String> body,
                                             @RequestHeader(value="Authorization",required=false) String authHeader){
        try {
            String userId = extractUserId(authHeader);
            if (userId == null) return ResponseEntity.status(401).body(Map.of("error","Token inválido"));
            
            UUID inviteUuid;
            try {
                inviteUuid = UUID.fromString(inviteId);
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body(Map.of("error","Convite inválido"));
            }
            
            Optional<ChallengeInvite> opt = challengeInviteRepository.findById(inviteUuid);
            if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error","Convite não encontrado"));
            
            ChallengeInvite inv = opt.get();
            if (!Objects.equals(inv.getInviteeId(), userId))
                return ResponseEntity.status(403).body(Map.of("error","Este convite não é para você"));
            
            String action = body.get("action");
            if (!"accept".equals(action) && !"decline".equals(action))
                return ResponseEntity.badRequest().body(Map.of("error","Ação inválida"));
            
            if ("accept".equals(action)) {
                // Adicionar ao desafio
                Optional<Challenge> chOpt = challengeRepository.findById(inv.getChallengeId());
                if (chOpt.isEmpty()) {
                    challengeInviteRepository.delete(inv);
                    return ResponseEntity.status(404).body(Map.of("error","Desafio não encontrado"));
                }
                
                Challenge c = chOpt.get();
                if ("COMPLETED".equals(c.getStatus()) || "CANCELLED".equals(c.getStatus())) {
                    challengeInviteRepository.delete(inv);
                    return ResponseEntity.badRequest().body(Map.of("error","Desafio indisponível"));
                }
                
                // Verificar se está banido
                if (c.getBannedUserIds() != null && c.getBannedUserIds().contains(userId)) {
                    challengeInviteRepository.delete(inv);
                    return ResponseEntity.badRequest().body(Map.of("error","Você está banido deste desafio"));
                }
                
                // Adicionar como participante
                if (c.getParticipants() == null) c.setParticipants(new ArrayList<>());
                if (!c.getParticipants().contains(userId)) {
                    c.getParticipants().add(userId);
                    challengeRepository.save(c);
                }
                
                inv.setStatus(InviteStatus.ACCEPTED);
                challengeInviteRepository.save(inv);
                
                return ResponseEntity.ok(Map.of("message","Convite aceito com sucesso"));
            } else {
                inv.setStatus(InviteStatus.DECLINED);
                challengeInviteRepository.save(inv);
                return ResponseEntity.ok(Map.of("message","Convite recusado"));
            }
        } catch(Exception e){
            return ResponseEntity.status(500).body(Map.of("error","Falha ao responder: "+e.getMessage()));
        }
    }

    @DeleteMapping("/challenges/invites/{inviteId}")
    public ResponseEntity<?> cancelInvite(@PathVariable String inviteId,
                                          @RequestHeader(value="Authorization",required=false) String authHeader){
        try {
            String userId = extractUserId(authHeader);
            if (userId == null) return ResponseEntity.status(401).body(Map.of("error","Token inválido"));
            UUID inviteUuid;
            try {
                inviteUuid = UUID.fromString(inviteId);
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body(Map.of("error","Convite inválido"));
            }
            Optional<ChallengeInvite> opt = challengeInviteRepository.findById(inviteUuid);
            if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error","Convite não encontrado"));
            ChallengeInvite inv = opt.get();
            if (!Objects.equals(inv.getInviterId(), userId))
                return ResponseEntity.status(403).body(Map.of("error","Somente quem convidou pode cancelar"));
            challengeInviteRepository.delete(inv);
            return ResponseEntity.ok(Map.of("message","Convite cancelado"));
        } catch(Exception e){
            return ResponseEntity.status(500).body(Map.of("error","Falha ao cancelar: "+e.getMessage()));
        }
    }

    @PostMapping("/challenges/{id}/kick/{userId}")
    public ResponseEntity<?> kickParticipant(@PathVariable String id,
                                             @PathVariable String userId,
                                             @RequestHeader(value="Authorization",required=false) String authHeader){
        try {
            String requester = extractUserId(authHeader);
            if (requester == null) return ResponseEntity.status(401).body(Map.of("error","Token inválido"));
            Long challengeId = Long.parseLong(id);
            Challenge c = challengeRepository.findById(challengeId).orElse(null);
            if (c == null) return ResponseEntity.status(404).body(Map.of("error","Desafio não encontrado"));
            if (!Objects.equals(c.getCreatorId(), requester))
                return ResponseEntity.status(403).body(Map.of("error","Somente criador"));
            if (!"NOT_STARTED".equals(c.getStatus()))
                return ResponseEntity.badRequest().body(Map.of("error","Só antes de iniciar"));
            boolean hadPaid = c.getPaidUserIds()!=null && c.getPaidUserIds().contains(userId);
            if (c.getParticipants()!=null) c.getParticipants().remove(userId);
            if (Objects.equals(c.getAcceptorId(), userId)) c.setAcceptorId(null);
            if (c.getPaidUserIds()!=null) c.getPaidUserIds().remove(userId);
            challengeRepository.save(c);
            double refund = 0.0;
            if (hadPaid) {
                double feePct = c.getParticipationFeePercent()!=null? c.getParticipationFeePercent():15.0;
                double fee = c.getAmount() * (feePct/100.0);
                refund = c.getAmount() - fee; // simples
            }
            return ResponseEntity.ok(Map.of("message","Participante removido","hadPaid",hadPaid,"refundAmount",refund));
        } catch(Exception e){
            return ResponseEntity.status(500).body(Map.of("error","Falha ao remover: "+e.getMessage()));
        }
    }

    @PostMapping("/challenges/{id}/ban/{userId}")
    public ResponseEntity<?> banParticipant(@PathVariable String id,
                                            @PathVariable String userId,
                                            @RequestHeader(value="Authorization",required=false) String authHeader){
        try {
            String requester = extractUserId(authHeader);
            if (requester == null) return ResponseEntity.status(401).body(Map.of("error","Token inválido"));
            Long challengeId = Long.parseLong(id);
            Challenge c = challengeRepository.findById(challengeId).orElse(null);
            if (c == null) return ResponseEntity.status(404).body(Map.of("error","Desafio não encontrado"));
            if (!Objects.equals(c.getCreatorId(), requester))
                return ResponseEntity.status(403).body(Map.of("error","Somente criador"));
            if (c.getBannedUserIds()==null) c.setBannedUserIds(new ArrayList<>());
            if (!c.getBannedUserIds().contains(userId)) c.getBannedUserIds().add(userId);
            boolean hadPaid = c.getPaidUserIds()!=null && c.getPaidUserIds().contains(userId);
            if (c.getParticipants()!=null) c.getParticipants().remove(userId);
            if (Objects.equals(c.getAcceptorId(), userId)) c.setAcceptorId(null);
            if (c.getPaidUserIds()!=null) c.getPaidUserIds().remove(userId);
            challengeRepository.save(c);
            double refund = 0.0;
            if (hadPaid) {
                double feePct = c.getParticipationFeePercent()!=null? c.getParticipationFeePercent():15.0;
                double fee = c.getAmount() * (feePct/100.0);
                refund = c.getAmount() - fee;
            }
            return ResponseEntity.ok(Map.of("message","Participante banido","hadPaid",hadPaid,"refundAmount",refund));
        } catch(Exception e){
            return ResponseEntity.status(500).body(Map.of("error","Falha ao banir: "+e.getMessage()));
        }
    }

    @PostMapping("/challenges/{id}/cancel")
    public ResponseEntity<?> cancelForUser(@PathVariable String id,
                                           @RequestHeader(value="Authorization",required=false) String authHeader){
        try {
            String userId = extractUserId(authHeader);
            if (userId == null) return ResponseEntity.status(401).body(Map.of("error","Token inválido"));
            Long challengeId = Long.parseLong(id);
            Challenge c = challengeRepository.findById(challengeId).orElse(null);
            if (c == null) return ResponseEntity.status(404).body(Map.of("error","Desafio não encontrado"));
            if (List.of("COMPLETED","CANCELLED").contains(c.getStatus()))
                return ResponseEntity.badRequest().body(Map.of("error","Status não permite desistir"));
            
            boolean creatorResigned = userId.equals(c.getCreatorId());
            boolean wasPaid = c.getPaidUserIds()!=null && c.getPaidUserIds().contains(userId);
            double fee = 0.0;
            double refund = 0.0;
            if (wasPaid) {
                double feePct = 75.0; // taxa fixa sobre valor líquido
                double participationFeePct = c.getParticipationFeePercent()!=null? c.getParticipationFeePercent():15.0;
                double net = c.getAmount() - (c.getAmount() * participationFeePct/100.0);
                fee = net * (feePct/100.0);
                refund = net - fee;
            }
            
            // Remover usuário das coleções (mas manter creatorId para propriedade do desafio)
            if (c.getPaidUserIds()!=null) c.getPaidUserIds().remove(userId);
            if (c.getParticipants()!=null) c.getParticipants().remove(userId);
            if (Objects.equals(c.getAcceptorId(), userId)) c.setAcceptorId(null);
            
            // Se criador desistiu, marcar que não participa mais
            if (creatorResigned && Boolean.TRUE.equals(c.getCreatorParticipates())) {
                c.setCreatorParticipates(false);
            }
            
            // Verificar se restaram participantes ativos
            List<String> still = new ArrayList<>();
            if (Boolean.TRUE.equals(c.getCreatorParticipates()) && c.getCreatorId()!=null) still.add(c.getCreatorId());
            if (c.getAcceptorId()!=null) still.add(c.getAcceptorId());
            if (c.getParticipants()!=null) still.addAll(c.getParticipants());
            boolean globalCancelled = still.isEmpty();
            if (globalCancelled) c.setStatus("CANCELLED");
            
            challengeRepository.save(c);
            return ResponseEntity.ok(Map.of(
                    "message","Desistência processada",
                    "wasPaid", wasPaid,
                    "feeApplied", fee,
                    "refundAmount", refund,
                    "globalCancelled", globalCancelled,
                    "creatorResigned", creatorResigned
            ));
        } catch(Exception e){
            return ResponseEntity.status(500).body(Map.of("error","Falha ao desistir: "+e.getMessage()));
        }
    }

    @GetMapping("/challenges/invite/{code}")
    public ResponseEntity<?> validateInviteCode(@PathVariable String code) {
        Challenge c = challengeRepository.findByShareLink(code).orElse(null);
        if (c == null) return ResponseEntity.status(404).body(Map.of("error","Convite inválido"));
        if ("COMPLETED".equals(c.getStatus()) || "CANCELLED".equals(c.getStatus()))
            return ResponseEntity.badRequest().body(Map.of("error","Desafio indisponível"));
        return ResponseEntity.ok(Map.of("challenge", c.toMap()));
    }

    @PostMapping("/challenges/invite/{code}/join")
    public ResponseEntity<?> joinByInvite(@PathVariable String code,
                                          @RequestHeader(value="Authorization",required=false) String authHeader){
        String userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("error","Token inválido"));
        Challenge c = challengeRepository.findByShareLink(code).orElse(null);
        if (c == null) return ResponseEntity.status(404).body(Map.of("error","Convite inválido"));
        if ("COMPLETED".equals(c.getStatus()) || "CANCELLED".equals(c.getStatus()))
            return ResponseEntity.badRequest().body(Map.of("error","Desafio indisponível"));
        if ("IN_PROGRESS".equals(c.getStatus()) && Boolean.FALSE.equals(c.getAllowGuests()))
            return ResponseEntity.badRequest().body(Map.of("error","Entradas bloqueadas"));
        // adicionar participante
        if (c.getParticipants()==null) c.setParticipants(new ArrayList<>());
        if (!c.getParticipants().contains(userId)) c.getParticipants().add(userId);
        challengeRepository.save(c);
        return ResponseEntity.ok(Map.of("message","Participante adicionado","challenge", c.toMap()));
    }

    @GetMapping("/challenges/{id}/available-friends")
    public ResponseEntity<?> getAvailableFriends(@PathVariable String id,
                                                 @RequestHeader(value="Authorization", required=false) String authHeader) {
        try {
            String userId = extractUserId(authHeader);
            if (userId == null) return ResponseEntity.status(401).body(Map.of("error","Token inválido"));

            Long challengeId = Long.parseLong(id);
            Optional<Challenge> opt = challengeRepository.findById(challengeId);
            if (opt.isEmpty()) return ResponseEntity.ok(List.of()); // retorna vazio para evitar 404 no front

            Challenge c = opt.get();

            // Montar conjunto de IDs a excluir (já participam ou pendentes)
            Set<String> exclude = new HashSet<>();
            if (Boolean.TRUE.equals(c.getCreatorParticipates()) && c.getCreatorId()!=null) exclude.add(c.getCreatorId());
            if (c.getAcceptorId()!=null) exclude.add(c.getAcceptorId());
            if (c.getParticipants()!=null) exclude.addAll(c.getParticipants());
            List<ChallengeInvite> invites = challengeInviteRepository.findByChallengeId(challengeId);
            for (ChallengeInvite inv : invites) {
                if (inv.getStatus() == InviteStatus.PENDING && inv.getInviteeId()!=null) {
                    exclude.add(inv.getInviteeId());
                }
            }

            // Buscar amigos do usuário (user-service)
            String url = "http://localhost:8081/api/friends";
            HttpHeaders headers = new HttpHeaders();
            if (authHeader != null) headers.set("Authorization", authHeader);
            HttpEntity<Void> req = new HttpEntity<>(headers);
            ResponseEntity<List<Map<String,Object>>> resp = restTemplate.exchange(
                    url, HttpMethod.GET, req,
                    new org.springframework.core.ParameterizedTypeReference<List<Map<String,Object>>>() {}
            );

            if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
                return ResponseEntity.ok(List.of());
            }

            // Filtrar os amigos que não estão em exclude
            List<Map<String,Object>> filtered = resp.getBody().stream()
                    .filter(u -> {
                        Object oid = u.get("id");
                        return oid != null && !exclude.contains(String.valueOf(oid));
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(filtered);
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error","ID inválido"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error","Falha ao carregar amigos: " + e.getMessage()));
        }
    }

    private String getenvOrProp(String env, String prop, String def) {
        String v = System.getenv(env);
        if (v != null && !v.isBlank()) return v;
        v = System.getProperty(prop);
        if (v != null && !v.isBlank()) return v;
        return def;
    }
    private int parseInt(String v, int def) {
        try { return Integer.parseInt(v.trim()); } catch (Exception e) { return def; }
    }

    private Optional<String> fetchUserEmail(String userId, String authHeader) {
        try {
            String url = "http://localhost:8081/api/users/" + userId;
            HttpHeaders headers = new HttpHeaders();
            if (authHeader != null) {
                headers.set("Authorization", authHeader);
            }
            HttpEntity<Void> requestEntity = new HttpEntity<>(headers);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, HttpMethod.GET, requestEntity,
                new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {});
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String email = (String) response.getBody().get("email");
                return Optional.ofNullable(email);
            }
        } catch (Exception e) {
            System.err.println("Erro ao buscar email do usuário: " + e.getMessage());
        }
        return Optional.empty();
    }

    private boolean sendEmail(String to, String subject, String body) {
        try {
            String smtpHost = getenvOrProp("SMTP_HOST", "smtp.host", "localhost");
            int smtpPort = parseInt(getenvOrProp("SMTP_PORT", "smtp.port", "25"), 25);
            try (Socket socket = new Socket(smtpHost, smtpPort);
                 BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
                 Writer writer = new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8)) {
                
                reader.readLine();
                writer.write("HELO localhost\r\n");
                writer.flush();
                reader.readLine();
                
                writer.write("MAIL FROM:<noreply@euduvido.com>\r\n");
                writer.flush();
                reader.readLine();
                
                writer.write("RCPT TO:<" + to + ">\r\n");
                writer.flush();
                reader.readLine();
                
                writer.write("DATA\r\n");
                writer.flush();
                reader.readLine();
                
                writer.write("Subject: " + subject + "\r\n");
                writer.write("From: noreply@euduvido.com\r\n");
                writer.write("To: " + to + "\r\n");
                writer.write("\r\n");
                writer.write(body + "\r\n");
                writer.write(".\r\n");
                writer.flush();
                reader.readLine();
                
                writer.write("QUIT\r\n");
                writer.flush();
                
                return true;
            }
        } catch (Exception e) {
            System.err.println("Erro ao enviar email: " + e.getMessage());
            return false;
        }
    }

    @PostMapping("/challenges/{id}/cancel-challenge")
    public ResponseEntity<?> cancelChallengeByCreator(@PathVariable String id,
                                                      @RequestHeader(value="Authorization",required=false) String authHeader) {
        try {
            String requesterId = extractUserId(authHeader);
            if (requesterId == null) return ResponseEntity.status(401).body(Map.of("error","Token inválido"));

            Long challengeId = Long.parseLong(id);
            Optional<Challenge> opt = challengeRepository.findById(challengeId);
            if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error","Desafio não encontrado"));

            Challenge c = opt.get();
            if (!Objects.equals(c.getCreatorId(), requesterId))
                return ResponseEntity.status(403).body(Map.of("error","Somente o criador pode cancelar este desafio"));
            if (!"NOT_STARTED".equals(c.getStatus()))
                return ResponseEntity.badRequest().body(Map.of("error","Somente desafios com status 'NOT_STARTED' podem ser cancelados pelo criador"));

            // Preparar lista de reembolsos: todos que já pagaram
            List<String> paidUsers = c.getPaidUserIds() != null ? new ArrayList<>(c.getPaidUserIds()) : new ArrayList<>();
            Double amount = c.getAmount() != null ? c.getAmount() : 0.0;
            String description = "Reembolso: cancelamento do desafio #" + c.getId();

            List<String> refunded = new ArrayList<>();
            List<String> failed = new ArrayList<>();

            for (String uid : paidUsers) {
                try {
                    boolean ok = creditUser(uid, amount, description, authHeader);
                    if (ok) refunded.add(uid);
                    else failed.add(uid);
                } catch (Exception ex) {
                    failed.add(uid);
                }
            }

            // Remover convites associados
            try {
                List<ChallengeInvite> invites = challengeInviteRepository.findByChallengeId(challengeId);
                if (invites != null && !invites.isEmpty()) {
                    challengeInviteRepository.deleteAll(invites);
                }
            } catch (Exception ignore) {}

            // Excluir desafio
            challengeRepository.deleteById(challengeId);

            return ResponseEntity.ok(Map.of(
                    "message", "Desafio cancelado e removido",
                    "challengeId", challengeId,
                    "refundedUserIds", refunded,
                    "failedRefundUserIds", failed,
                    "refundAmountPerUser", amount
            ));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error","ID inválido"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error","Falha ao cancelar desafio: " + e.getMessage()));
        }
    }

    // Tenta creditar o usuário alvo. Estratégia:
    // 1) POST /api/wallet/credit { amount, description, userId }
    // 2) fallback: POST /api/wallet/deposit { amount, description } com X-Impersonate-User
    private boolean creditUser(String targetUserId, Double amount, String description, String authHeader) {
        try {
            String urlCredit = "http://localhost:8083/api/wallet/credit";
            Map<String, Object> body = new HashMap<>();
            body.put("amount", amount);
            body.put("description", description);
            body.put("userId", targetUserId);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (authHeader != null) headers.set("Authorization", authHeader);
            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<Map<String, Object>> resp = restTemplate.exchange(
                    urlCredit, HttpMethod.POST, requestEntity,
                    new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {});
            if (resp.getStatusCode().is2xxSuccessful()) return true;
        } catch (Exception ignore) {
            // tenta fallback
        }

        try {
            String urlDeposit = "http://localhost:8083/api/wallet/deposit";
            Map<String, Object> body = new HashMap<>();
            body.put("amount", amount);
            body.put("description", description + " (fallback)");
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (authHeader != null) headers.set("Authorization", authHeader);
            // tentativa de impersonação (se suportado pelo wallet-service)
            headers.set("X-Impersonate-User", targetUserId);
            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<Map<String, Object>> resp = restTemplate.exchange(
                    urlDeposit, HttpMethod.POST, requestEntity,
                    new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {});
            return resp.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            return false;
        }
    }

    @PostMapping("/challenges/{id}/finish-request")
    public ResponseEntity<?> requestFinish(@PathVariable String id,
                                           @RequestHeader(value="Authorization",required=false) String authHeader) {
        try {
            String requesterId = extractUserId(authHeader);
            if (requesterId == null)
                return ResponseEntity.status(401).body(Map.of("error","Token inválido"));

            Long challengeId = Long.parseLong(id);
            Challenge c = challengeRepository.findById(challengeId).orElse(null);
            if (c == null)
                return ResponseEntity.status(404).body(Map.of("error","Desafio não encontrado"));

            // apenas criador
            if (!Objects.equals(c.getCreatorId(), requesterId))
                return ResponseEntity.status(403).body(Map.of("error","Somente o criador pode solicitar encerramento"));

            // só em andamento
            if (!"IN_PROGRESS".equals(c.getStatus()))
                return ResponseEntity.badRequest().body(Map.of("error","Só é possível solicitar encerramento com o desafio em andamento"));

            long now = System.currentTimeMillis();
            Long lastReq = c.getFinishRequestAt();
            boolean active = Boolean.TRUE.equals(c.getFinishRequestActive());
            // bloquear nova solicitação por 24h desde a ÚLTIMA (seja aceita ou cancelada)
            if (lastReq != null) {
                long diff = now - lastReq;
                long minMillis = 24L * 60L * 60L * 1000L;
                if (diff < minMillis && active) {
                    long falta = minMillis - diff;
                    long horas = falta / (60L*60L*1000L);
                    return ResponseEntity.badRequest().body(Map.of(
                            "error","Já existe um pedido de encerramento pendente",
                            "hoursRemaining", horas
                    ));
                }
                if (diff < minMillis && !active) {
                    long falta = minMillis - diff;
                    long horas = falta / (60L*60L*1000L);
                    return ResponseEntity.badRequest().body(Map.of(
                            "error","Criador só pode solicitar novo encerramento após 24h do último pedido",
                            "hoursRemaining", horas
                    ));
                }
            }

            // iniciar novo pedido
            c.setFinishRequestAt(now);
            c.setFinishRequestBy(requesterId);
            c.setFinishRequestActive(true);
            c.setFinishAcceptedUserIds(new ArrayList<>(List.of(requesterId))); // criador já aceita por padrão
            challengeRepository.save(c);

            return ResponseEntity.ok(Map.of(
                    "message","Pedido de encerramento criado. Aguardando aprovação de todos os participantes.",
                    "challenge", c.toMap()
            ));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error","ID inválido"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error","Falha ao solicitar encerramento: "+e.getMessage()));
        }
    }

    @GetMapping("/challenges/{id}/finish-request")
    public ResponseEntity<?> getFinishRequest(@PathVariable String id,
                                              @RequestHeader(value="Authorization",required=false) String authHeader) {
        try {
            String userId = extractUserId(authHeader);
            if (userId == null)
                return ResponseEntity.status(401).body(Map.of("error","Token inválido"));

            Long challengeId = Long.parseLong(id);
            Challenge c = challengeRepository.findById(challengeId).orElse(null);
            if (c == null)
                return ResponseEntity.status(404).body(Map.of("error","Desafio não encontrado"));

            boolean active = Boolean.TRUE.equals(c.getFinishRequestActive());
            List<String> activeParticipants = c.getActiveParticipantIds();
            List<String> accepted = c.getFinishAcceptedUserIds() != null ? c.getFinishAcceptedUserIds() : List.of();

            Map<String,Object> payload = new HashMap<>();
            payload.put("active", active);
            payload.put("finishRequestAt", c.getFinishRequestAt());
            payload.put("finishRequestBy", c.getFinishRequestBy());
            payload.put("acceptedCount", accepted.size());
            payload.put("totalRequired", activeParticipants.size());
            payload.put("acceptedUserIds", accepted);
            payload.put("userHasAccepted", accepted.contains(userId));
            payload.put("userIsParticipant", c.isUserParticipant(userId) || Objects.equals(c.getCreatorId(), userId));
            return ResponseEntity.ok(payload);
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error","ID inválido"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error","Falha ao consultar pedido: "+e.getMessage()));
        }
    }

    @PostMapping("/challenges/{id}/finish-request/respond")
    public ResponseEntity<?> respondFinish(@PathVariable String id,
                                           @RequestBody Map<String,String> body,
                                           @RequestHeader(value="Authorization",required=false) String authHeader) {
        try {
            String userId = extractUserId(authHeader);
            if (userId == null)
                return ResponseEntity.status(401).body(Map.of("error","Token inválido"));

            Long challengeId = Long.parseLong(id);
            Challenge c = challengeRepository.findById(challengeId).orElse(null);
            if (c == null)
                return ResponseEntity.status(404).body(Map.of("error","Desafio não encontrado"));

            if (!Boolean.TRUE.equals(c.getFinishRequestActive()) || c.getFinishRequestAt() == null)
                return ResponseEntity.badRequest().body(Map.of("error","Nenhum pedido de encerramento ativo"));

            if (!c.isUserParticipant(userId) && !Objects.equals(c.getCreatorId(), userId))
                return ResponseEntity.status(403).body(Map.of("error","Somente participantes podem responder"));

            String action = Optional.ofNullable(body.get("action")).orElse("").toLowerCase(Locale.ROOT);
            if (!action.equals("accept") && !action.equals("reject"))
                return ResponseEntity.badRequest().body(Map.of("error","Ação inválida (use 'accept' ou 'reject')"));

            if (action.equals("reject")) {
                // qualquer rejeição cancela o pedido, mantém status IN_PROGRESS
                c.setFinishRequestActive(false);
                c.setFinishAcceptedUserIds(new ArrayList<>());
                challengeRepository.save(c);
                return ResponseEntity.ok(Map.of(
                        "message","Pedido de encerramento rejeitado. O desafio continua em andamento.",
                        "rejectedBy", userId
                ));
            }

            // accept
            if (c.getFinishAcceptedUserIds() == null)
                c.setFinishAcceptedUserIds(new ArrayList<>());
            if (!c.getFinishAcceptedUserIds().contains(userId)) {
                c.getFinishAcceptedUserIds().add(userId);
            }

            // verificar se todos ativos aceitaram
            List<String> activeParticipants = c.getActiveParticipantIds()
                .stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .collect(Collectors.toList());
            List<String> accepted = c.getFinishAcceptedUserIds() != null ? c.getFinishAcceptedUserIds() : List.of();
            boolean allAccepted = activeParticipants.stream().allMatch(accepted::contains);

            if (allAccepted) {
                // Todos aceitaram: concluir desafio e calcular vencedor
                c.setFinishRequestActive(false);
                c.setStatus("COMPLETED"); // GARANTE status COMPLETED
                // Calcular vencedor via proof-service
                String winnerId = null;
                try {
                    String proofServiceUrl = "http://localhost:8085/api/proofs/challenge/" + challengeId + "/winner";
                    HttpHeaders headers = new HttpHeaders();
                    if (authHeader != null) headers.set("Authorization", authHeader);
                    HttpEntity<Void> req = new HttpEntity<>(headers);
                    ResponseEntity<Map> resp = restTemplate.exchange(
                        proofServiceUrl, HttpMethod.GET, req,
                        new org.springframework.core.ParameterizedTypeReference<Map>() {});
                    if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
                        Object winnerObj = resp.getBody().get("winnerId");
                        if (winnerObj != null) {
                            winnerId = String.valueOf(winnerObj);
                            c.setWinnerId(winnerId);
                        } else {
                            c.setWinnerId(null);
                        }
                    } else {
                        c.setWinnerId(null);
                    }
                } catch (Exception ex) {
                    // Se falhar, apenas loga e segue sem vencedor
                    System.err.println("[ENCERRAMENTO] Falha ao calcular vencedor: " + ex.getMessage());
                    c.setWinnerId(null);
                }
                challengeRepository.save(c);
                // Nunca retorna erro 500 aqui
                return ResponseEntity.ok(Map.of(
                        "message","Todos aceitaram. Desafio concluído.",
                        "challenge", c.toMap(),
                        "allAccepted", true,
                        "winnerId", winnerId,
                        "status", c.getStatus() // ADICIONADO: retorna status para verificação
                ));
            } else {
                challengeRepository.save(c);
                return ResponseEntity.ok(Map.of(
                        "message","Voto registrado. Aguardando os demais participantes.",
                        "acceptedCount", accepted.size(),
                        "totalRequired", activeParticipants.size(),
                        "allAccepted", false,
                        "status", c.getStatus() // ADICIONADO: retorna status para verificação
                ));
            }
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error","ID inválido"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error","Falha ao responder encerramento: "+e.getMessage()));
        }
    }
}