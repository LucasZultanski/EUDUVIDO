package com.example.proof_service.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.auth0.jwt.JWT;
import com.auth0.jwt.interfaces.DecodedJWT;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.*;
import java.util.stream.Collectors;

import com.example.proof_service.model.Proof;
import com.example.proof_service.repository.ProofRepository;

@RestController
@RequestMapping("/api/proofs")
@CrossOrigin(
    origins = "*",
    allowedHeaders = "*",
    exposedHeaders = {"Authorization"},
    methods = {RequestMethod.GET,RequestMethod.POST,RequestMethod.OPTIONS}
)
public class ProofController {

    private static final Logger log = LoggerFactory.getLogger(ProofController.class);

    @Autowired
    private ProofRepository proofRepository;

    // Corrigido: removido uso de proofs Map, usar apenas banco via proofRepository
    // NOVO: responder preflight explicitamente (mantém compatibilidade)
    @RequestMapping(method = RequestMethod.OPTIONS, path = {"", "/**"})
    public ResponseEntity<?> options(@RequestParam(required = false) String challengeId) {
        return ResponseEntity.ok().build();
    }

    // NOVO: método utilitário robusto para buscar provas por challengeId (long) ou string
    private List<Proof> safeFindProofsByChallenge(String challengeIdStr) {
        try {
            if (challengeIdStr == null) return Collections.emptyList();
            String s = challengeIdStr.trim();
            if (s.isEmpty()) return Collections.emptyList();
            Long lid;
            try {
                lid = Long.parseLong(s);
            } catch (Exception e) {
                lid = null;
            }
            if (lid != null) {
                try {
                    return proofRepository.findByChallengeId(lid);
                } catch (Exception ex) {
                    log.warn("[safeFind] findByChallengeId failed for id={} -> {}", lid, ex.getMessage());
                }
            }
            try {
                return proofRepository.findByChallengeIdString(s);
            } catch (Exception ex) {
                log.warn("[safeFind] findByChallengeIdString failed for code='{}' -> {}", s, ex.getMessage());
            }
            // fallback: fetch all and filter (safe but more expensive)
            try {
                List<Proof> all = proofRepository.findAll();
                if (lid != null) {
                    final Long finalLid = lid;
                    return all.stream().filter(p -> Objects.equals(p.getChallengeId(), finalLid)).collect(Collectors.toList());
                } else {
                    return all.stream().filter(p -> s.equals(p.getChallengeIdString())).collect(Collectors.toList());
                }
            } catch (Exception ex) {
                log.error("[safeFind] fallback findAll failed -> {}", ex.getMessage(), ex);
                return Collections.emptyList();
            }
        } catch (Exception ex) {
            log.error("[safeFind] unexpected error -> {}", ex.getMessage(), ex);
            return Collections.emptyList();
        }
    }

    @GetMapping
    public ResponseEntity<List<Proof>> getProofs(@RequestParam(required = false) String challengeId) {
        try {
            if (challengeId == null || challengeId.isBlank()) {
                return ResponseEntity.ok(proofRepository.findAll());
            }
            List<Proof> results = safeFindProofsByChallenge(challengeId);
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            log.error("[getProofs] error for challengeId='{}' -> {}", challengeId, e.getMessage(), e);
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    // NOVO: atalho sem query string
    @GetMapping("/challenge/{challengeId}")
    public ResponseEntity<List<Proof>> getProofsByPath(@PathVariable String challengeId) {
        try {
            List<Proof> results = safeFindProofsByChallenge(challengeId);
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            log.error("[getProofsByPath] error for challengeId='{}' -> {}", challengeId, e.getMessage(), e);
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    // Corrigido: getProofsFull agora busca do banco, não do Map
    @GetMapping("/challenge/{challengeId}/full")
    public ResponseEntity<List<Map<String,Object>>> getProofsFull(@PathVariable String challengeId) {
        List<Map<String,Object>> out = new ArrayList<>();
        try {
            List<Proof> proofs = safeFindProofsByChallenge(challengeId);
            for (Proof p : proofs) {
                if (p == null) continue;
                Map<String,Object> map = new LinkedHashMap<>();
                map.put("id", p.getId());
                map.put("challengeId", p.getChallengeId());
                map.put("description", p.getDescription());
                map.put("timestamp", p.getTimestamp());
                map.put("createdAt", p.getCreatedAt());
                map.put("status", p.getStatus());
                map.put("userId", p.getUserId());
                map.put("elapsedMinutes", p.getElapsedMinutes());
                map.put("distance", p.getDistance());
                map.put("studyTime", p.getStudyTime());
                map.put("studyTimeFormatted", p.getStudyTimeFormatted());
                map.put("meals", p.getMeals());
                map.put("checkinTime", p.getCheckinTime());
                map.put("checkoutTime", p.getCheckoutTime());
                // NÃO expor base64 pesada na listagem
                out.add(map);
                if (out.size() >= 500) break;
            }
            return ResponseEntity.ok(out);
        } catch (Exception ex) {
            log.error("[getProofsFull] error for challengeId='{}' -> {}", challengeId, ex.getMessage(), ex);
            return ResponseEntity.ok(Collections.emptyList());
        }
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

    @PostMapping
    public ResponseEntity<?> uploadProof(@RequestBody Map<String, Object> payload,
                                         @RequestHeader(value = "Authorization", required = false) String authHeader,
                                         @RequestHeader(value = "X-Impersonate-User", required = false) String impersonateHeader) {
        try {
            // 1. Extrair userId (token, header, payload, fallback)
            String userId = extractUserId(authHeader);
            if ((userId == null || userId.isBlank()) && impersonateHeader != null && !impersonateHeader.isBlank()) {
                userId = impersonateHeader;
                log.info("[uploadProof] usando X-Impersonate-User: {}", userId);
            }
            if ((userId == null || userId.isBlank()) && payload.get("userId") != null) {
                userId = String.valueOf(payload.get("userId"));
                log.info("[uploadProof] usando payload.userId: {}", userId);
            }
            if (userId == null || userId.isBlank()) {
                userId = "anonymous";
                log.warn("[uploadProof] userId não informado, usando 'anonymous'");
            }

            // 2. Extrair challengeId (número ou string)
            Object challengeIdObj = payload.get("challengeId");
            Long challengeIdLong = null;
            String challengeIdStr = null;
            if (challengeIdObj != null) {
                try {
                    challengeIdLong = Long.parseLong(challengeIdObj.toString());
                } catch (Exception e) {
                    challengeIdStr = challengeIdObj.toString();
                }
            }
            if (challengeIdLong == null && (challengeIdStr == null || challengeIdStr.isBlank())) {
                log.error("[uploadProof] challengeId ausente ou inválido");
                return ResponseEntity.badRequest().body(Map.of("error", true, "message", "challengeId obrigatório"));
            }

            // 3. Montar entidade Proof
            Proof proof = new Proof();
            proof.setCreatedAt(System.currentTimeMillis());
            proof.setTimestamp(System.currentTimeMillis());
            proof.setUserId(userId);

            if (challengeIdLong != null) proof.setChallengeId(challengeIdLong);
            if (challengeIdStr != null) proof.setChallengeIdString(challengeIdStr);

            proof.setDescription((String) payload.getOrDefault("description", "Check-in"));
            proof.setLocation((String) payload.getOrDefault("location", null));

            // 4. Fotos: aceita imageUrl ou photos (array ou string)
            Object photosObj = payload.get("photos");
            String photosStr = null;
            if (photosObj instanceof List) {
                List<?> photosList = (List<?>) photosObj;
                photosStr = String.join(",", photosList.stream().map(Object::toString).toArray(String[]::new));
            } else if (photosObj instanceof String) {
                photosStr = (String) photosObj;
            }
            if (photosStr != null) proof.setPhotos(photosStr);

            if (payload.containsKey("imageUrl")) {
                proof.setImageUrl((String) payload.get("imageUrl"));
            }

            // 5. proofTypes e proofValues
            Object typesObj = payload.get("proofTypes");
            if (typesObj instanceof List) {
                List<?> typesList = (List<?>) typesObj;
                proof.setProofTypes(typesList.stream().map(Object::toString).collect(java.util.stream.Collectors.toList()));
            }
            Object valuesObj = payload.get("proofValues");
            if (valuesObj instanceof Map) {
                Map<?,?> valuesMap = (Map<?,?>) valuesObj;
                Map<String,String> proofValues = new HashMap<>();
                for (Map.Entry<?,?> entry : valuesMap.entrySet()) {
                    proofValues.put(entry.getKey().toString(), entry.getValue() != null ? entry.getValue().toString() : "");
                }
                proof.setProofValues(proofValues);
            }

            // 6. Campos específicos
            if (payload.containsKey("checkinTime")) {
                try { proof.setCheckinTime(Long.parseLong(payload.get("checkinTime").toString())); } catch (Exception ignored) {}
            }
            if (payload.containsKey("checkoutTime")) {
                try { proof.setCheckoutTime(Long.parseLong(payload.get("checkoutTime").toString())); } catch (Exception ignored) {}
            }
            if (payload.containsKey("elapsedMinutes")) {
                try { proof.setElapsedMinutes(Long.parseLong(payload.get("elapsedMinutes").toString())); } catch (Exception ignored) {}
            }
            if (payload.containsKey("distance")) {
                try { proof.setDistance(Double.parseDouble(payload.get("distance").toString())); } catch (Exception ignored) {}
            }
            if (payload.containsKey("studyTime")) {
                try { proof.setStudyTime(Long.parseLong(payload.get("studyTime").toString())); } catch (Exception ignored) {}
            }
            if (payload.containsKey("studyTimeFormatted")) {
                proof.setStudyTimeFormatted((String) payload.get("studyTimeFormatted"));
            }
            if (payload.containsKey("meals")) {
                proof.setMeals((String) payload.get("meals"));
            }
            if (payload.containsKey("mealCount")) {
                try { proof.setMealCount(Integer.parseInt(payload.get("mealCount").toString())); } catch (Exception ignored) {}
            }
            if (payload.containsKey("requiredMeals")) {
                try { proof.setRequiredMeals(Integer.parseInt(payload.get("requiredMeals").toString())); } catch (Exception ignored) {}
            }
            if (payload.containsKey("date")) {
                proof.setDate((String) payload.get("date"));
            }

            // 7. Status
            String status = (String) payload.getOrDefault("status", null);
            if (status == null || status.isBlank()) {
                proof.setStatus("VALID");
            } else {
                proof.setStatus(status);
            }

            // 8. Salvar no banco
            Proof saved = proofRepository.save(proof);
            return ResponseEntity.ok(Map.of(
                "error", false,
                "id", saved.getId(),
                "message", "Prova enviada com sucesso",
                "status", saved.getStatus(),
                "proof", saved
            ));
        } catch (org.springframework.dao.DataIntegrityViolationException dive) {
            log.error("[uploadProof] DataIntegrityViolation: {}", dive.getMessage(), dive);
            return ResponseEntity.badRequest().body(Map.of("error", true, "message", "Dados inválidos para salvar prova", "detail", dive.getMessage()));
        } catch (Exception ex) {
            log.error("[uploadProof] erro inesperado: {}", ex.getMessage(), ex);
            return ResponseEntity.status(500).body(Map.of("error", true, "message", "Falha ao processar prova", "detail", ex.getClass().getSimpleName()));
        }
    }

    // Novo endpoint: aceita multipart/form-data posts to /api/proofs (file uploads)
    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<?> uploadProofMultipart(@RequestParam Map<String, String> params,
                                                  @RequestPart(value = "photo", required = false) org.springframework.web.multipart.MultipartFile file,
                                                  @RequestHeader(value = "Authorization", required = false) String authHeader,
                                                  @RequestHeader(value = "X-Impersonate-User", required = false) String impersonateHeader) {
        try {
            String userId = extractUserId(authHeader);
            if ((userId == null || userId.isBlank()) && impersonateHeader != null && !impersonateHeader.isBlank()) {
                userId = impersonateHeader;
                log.info("[uploadProofMultipart] using X-Impersonate-User header as userId={}", userId);
            }
            if ((userId == null || userId.isBlank()) && params.get("userId") != null) {
                userId = params.get("userId");
                log.info("[uploadProofMultipart] using params.userId as userId={}", userId);
            }
            if (userId == null) userId = "anonymous";

            Proof proof = new Proof();
            proof.setCreatedAt(System.currentTimeMillis());
            proof.setTimestamp(System.currentTimeMillis());
            proof.setUserId(userId);

            // Map params if present (string values from form)
            if (params.containsKey("challengeId")) {
                try { proof.setChallengeId(Long.parseLong(params.get("challengeId"))); } catch(Exception ignore) { proof.setChallengeIdString(params.get("challengeId")); }
            }
            proof.setDescription(params.getOrDefault("description", "Check-in"));
            proof.setLocation(params.getOrDefault("location", null));

            // Attach the uploaded file as base64 if present
            if (file != null && !file.isEmpty()) {
                try (java.io.InputStream in = file.getInputStream()) {
                    byte[] bytes = in.readAllBytes();
                    String b64 = "data:" + file.getContentType() + ";base64," + java.util.Base64.getEncoder().encodeToString(bytes);
                    proof.setPhotos(b64); // existing field
                } catch (Exception e) {
                    log.warn("[uploadProofMultipart] failed to read uploaded file -> {}", e.getMessage());
                }
            }

            // Parse numeric fields if present
            if (params.containsKey("distance")) {
                try { proof.setDistance(Double.parseDouble(params.get("distance"))); } catch (Exception ignored) {}
            }
            if (params.containsKey("elapsedMinutes")) {
                try { proof.setElapsedMinutes(Long.parseLong(params.get("elapsedMinutes"))); } catch (Exception ignored) {}
            }
            if (params.containsKey("checkinTime")) {
                try { proof.setCheckinTime(Long.parseLong(params.get("checkinTime"))); } catch (Exception ignored) {}
            }
            if (params.containsKey("checkoutTime")) {
                try { proof.setCheckoutTime(Long.parseLong(params.get("checkoutTime"))); } catch (Exception ignored) {}
            }

            // Status
            String status = params.getOrDefault("status", null);
            if (status == null || status.isBlank()) {
                proof.setStatus("VALID");
            } else {
                proof.setStatus(status);
            }

            Proof saved = proofRepository.save(proof);
            return ResponseEntity.ok(Map.of(
                "error", false,
                "id", saved.getId(),
                "message", "Prova enviada com sucesso (multipart)",
                "status", saved.getStatus(),
                "proof", saved
            ));
        } catch (Exception ex) {
            log.error("[uploadProofMultipart] unexpected error -> {}", ex.getMessage(), ex);
            return ResponseEntity.status(500).body(Map.of("error", true, "message", "Falha ao processar prova (multipart)", "detail", ex.getClass().getSimpleName()));
        }
    }

    @PostMapping("/checkin")
    public ResponseEntity<?> checkIn(@RequestBody Map<String, Object> checkinData) {
        return ResponseEntity.ok(Map.of(
            "message", "Check-in realizado com sucesso",
            "checkinTime", System.currentTimeMillis(),
            "location", checkinData.getOrDefault("location", "Localização capturada")
        ));
    }

    @GetMapping("/ping")
    public ResponseEntity<?> ping() {
        long count = proofRepository.count();
        return ResponseEntity.ok(Map.of("error", false, "pong", true, "count", count));
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        try {
            long count = proofRepository.count();
            return ResponseEntity.ok(Map.of("error", false, "status","UP","count", count));
        } catch (Exception ex) {
            return ResponseEntity.ok(Map.of("error", true, "status", "DOWN", "message", ex.getMessage()));
        }
    }

    @GetMapping("/internal/state")
    public ResponseEntity<?> internalState() {
        long count = proofRepository.count();
        List<Long> ids = proofRepository.findAll().stream().map(Proof::getId).collect(Collectors.toList());
        return ResponseEntity.ok(Map.of(
                "count", count,
                "ids", ids,
                "error", false
        ));
    }

    private Map<String,Object> sanitizeProof(Proof p) {
        if (p == null) return new LinkedHashMap<>();
        Map<String,Object> out = new LinkedHashMap<>();
        out.put("id", p.getId());
        out.put("challengeId", p.getChallengeId());
        out.put("description", p.getDescription());
        out.put("timestamp", p.getTimestamp());
        out.put("createdAt", p.getCreatedAt());
        out.put("status", p.getStatus());
        out.put("userId", p.getUserId());
        out.put("elapsedMinutes", p.getElapsedMinutes());
        out.put("distance", p.getDistance());
        out.put("studyTime", p.getStudyTime());
        out.put("studyTimeFormatted", p.getStudyTimeFormatted());
        out.put("meals", p.getMeals());
        out.put("checkinTime", p.getCheckinTime());
        out.put("checkoutTime", p.getCheckoutTime());
        return out;
    }

    @GetMapping("/challenge/{challengeId}/lite")
    public ResponseEntity<List<Map<String,Object>>> getProofsLite(@PathVariable String challengeId) {
        try {
            List<Proof> proofs = safeFindProofsByChallenge(challengeId);
            List<Map<String,Object>> lite = proofs.stream().map(this::sanitizeProof).collect(Collectors.toList());
            return ResponseEntity.ok(lite);
        } catch (Exception ex) {
            log.error("[getProofsLite] error for challengeId='{}' -> {}", challengeId, ex.getMessage(), ex);
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    @GetMapping("/challenge/{challengeId}/winner")
    public ResponseEntity<Map<String, Object>> getChallengeWinner(@PathVariable String challengeId) {
        try {
            Long wantedLong = null;
            String wantedStr = challengeId == null ? "" : challengeId.trim();
            try { wantedLong = Long.parseLong(wantedStr); } catch (NumberFormatException ignored) {}
            List<Proof> proofs;
            if (wantedLong != null) {
                proofs = proofRepository.findByChallengeId(wantedLong);
            } else {
                proofs = proofRepository.findByChallengeIdString(wantedStr);
            }
            Map<String, Integer> countByUser = new HashMap<>();
            for (Proof p : proofs) {
                if (p == null) continue;
                String status = String.valueOf(p.getStatus()).toUpperCase();
                if (!"VALID".equals(status)) continue;
                String userId = String.valueOf(p.getUserId());
                if (userId.isBlank()) continue;
                countByUser.put(userId, countByUser.getOrDefault(userId, 0) + 1);
            }
            String winnerId = null;
            int maxCount = 0;
            for (Map.Entry<String, Integer> entry : countByUser.entrySet()) {
                if (entry.getValue() > maxCount) {
                    maxCount = entry.getValue();
                    winnerId = entry.getKey();
                }
            }
            return ResponseEntity.ok(Map.of("winnerId", winnerId, "totalProofs", maxCount));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("winnerId", null, "totalProofs", 0));
        }
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleUnhandled(Exception ex) {
        log.error("[GLOBAL] unhandled exception -> {}", ex.getMessage(), ex);
        return ResponseEntity.ok(Map.of("error", true, "message", "Falha interna controller", "detail", ex.getClass().getSimpleName()));
    }
}
