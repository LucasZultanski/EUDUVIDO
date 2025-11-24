package com.example.challenge_service.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "challenges")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Challenge {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String description;
    
    @Column(nullable = false)
    private Double amount;
    
    @Column(nullable = false)
    private String type;
    
    @Column(columnDefinition = "TEXT")
    private String icon; // base64 data URL
    
    private Integer minWorkoutMinutes; // para tipo academia
    
    @ElementCollection
    @CollectionTable(name = "challenge_custom_proof_types", joinColumns = @JoinColumn(name = "challenge_id"))
    @Column(name = "proof_type")
    private List<String> customProofTypes; // para tipo custom
    
    private Integer duration; // duração em dias
    
    @Column(nullable = false)
    private Boolean allowGuests = true;
    
    @Column(nullable = false)
    private String status;
    
    @Column(nullable = false)
    private Long createdAt;
    
    @Column(nullable = false)
    private String creatorId;
    
    private String acceptorId;
    
    @Column(nullable = false)
    private Boolean paid = false;
    
    private Long startDate;
    
    private Long endDate;
    
    private String invitedUserId; // para convites
    
    @Column(unique = true)
    private String shareLink; // Link único para compartilhar/apostar no desafio
    
    @ElementCollection
    @CollectionTable(name = "challenge_participants", joinColumns = @JoinColumn(name = "challenge_id"))
    @Column(name = "participant_id")
    private List<String> participants; // Lista de IDs dos participantes (além de creatorId e acceptorId)
    
    @Column(name = "invite_permission", nullable = false)
    private String invitePermission = "CREATOR_ONLY"; // "CREATOR_ONLY" ou "ALL_PARTICIPANTS"
    
    @Column(name = "max_participants")
    private Integer maxParticipants; // null = ilimitado, ou número máximo de participantes
    private String winnerId; // ID do vencedor após confirmação

    // NOVO: limites e mínimos
    private Integer mealsPerDay;          // dieta
    private Integer mealCountPerDay;      // alias compat
    private Integer proofsPerDay;         // outros tipos
    private Double customMinKm;
    private Integer customMinTimeMinutes;
    private Integer customMinCount;      // mínimo de quantidade em custom
    private Integer minMealIntervalMinutes; // NOVO: intervalo mínimo entre refeições (minutos)
    
    @ElementCollection
    @CollectionTable(name = "challenge_paid_users", joinColumns = @JoinColumn(name = "challenge_id"))
    @Column(name = "paid_user_id")
    private List<String> paidUserIds; // NOVO: usuários que já pagaram
    // NOVO: taxa de participação em porcentagem (ex: 15 = 15%)
    private Double participationFeePercent = 15.0;

    // NOVO: se o criador participa deste desafio
    // Adiciona definicao de coluna com DEFAULT para auxiliar Hibernate a criar a coluna em bancos existentes (ddl-auto=update)
    @Column(name = "creator_participates", nullable = false, columnDefinition = "BOOLEAN DEFAULT TRUE")
    private Boolean creatorParticipates = true;

    // NOVO: lista de usuarios banidos (nao podem ser convidados ou entrar novamente)
    @ElementCollection
    @CollectionTable(name = "challenge_banned_users", joinColumns = @JoinColumn(name = "challenge_id"))
    @Column(name = "banned_user_id")
    private List<String> bannedUserIds;

    // NOVO: controle de pedido de encerramento
    @Column(name = "finish_request_at")
    private Long finishRequestAt; // epoch millis do último pedido de encerramento (ou null)

    @Column(name = "finish_request_by")
    private String finishRequestBy; // quem pediu (criador)

    @ElementCollection
    @CollectionTable(name = "challenge_finish_accepts", joinColumns = @JoinColumn(name = "challenge_id"))
    @Column(name = "user_id")
    private List<String> finishAcceptedUserIds; // quem já aceitou o encerramento

    @Column(name = "finish_request_active")
    private Boolean finishRequestActive; // true se há pedido pendente

    // Métodos helper para validação de convites
    public boolean isInviteLimitReached() {
        if (maxParticipants == null) {
            return false; // Ilimitado
        }
        int currentCount = getCurrentParticipantCount();
        return currentCount >= maxParticipants;
    }
    
    public int getCurrentParticipantCount() {
        int count = 0;
        // só conta criador se ainda participa
        if (Boolean.TRUE.equals(creatorParticipates) && creatorId != null) count++;
        if (acceptorId != null) count++;
        if (participants != null) count += participants.size();
        return count;
    }
    
    // NOVO: participantes "ativos" (usados para voto/aceite de encerramento)
    public List<String> getActiveParticipantIds() {
        List<String> ids = new ArrayList<>();
        if (Boolean.TRUE.equals(creatorParticipates) && creatorId != null) ids.add(creatorId);
        if (acceptorId != null) ids.add(acceptorId);
        if (participants != null) ids.addAll(participants);
        return ids.stream().distinct().collect(java.util.stream.Collectors.toList());
    }

    public boolean canUserInvite(String userId) {
        // Verificar se o limite foi atingido
        if (isInviteLimitReached()) {
            return false;
        }
        
        // Verificar permissão
        if ("CREATOR_ONLY".equals(invitePermission)) {
            return creatorId != null && creatorId.equals(userId);
        } else if ("ALL_PARTICIPANTS".equals(invitePermission)) {
            // Verificar se o usuário é criador, aceitador ou participante
            return (creatorId != null && creatorId.equals(userId)) ||
                   (acceptorId != null && acceptorId.equals(userId)) ||
                   (participants != null && participants.contains(userId));
        }
        return false;
    }
    
    public boolean isUserParticipant(String userId) {
        // criador só é considerado participante se creatorParticipates == true
        boolean creatorActive = Boolean.TRUE.equals(creatorParticipates) && creatorId != null && creatorId.equals(userId);
        boolean acceptorActive = acceptorId != null && acceptorId.equals(userId);
        boolean listActive = participants != null && participants.contains(userId);
        return creatorActive || acceptorActive || listActive;
    }
    
    // Método helper para converter para Map (compatibilidade com código existente)
    public java.util.Map<String, Object> toMap() {
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", id);
        map.put("description", description);
        map.put("amount", amount);
        map.put("type", type);
        map.put("icon", icon);
        map.put("minWorkoutMinutes", minWorkoutMinutes);
        map.put("customProofTypes", customProofTypes != null ? customProofTypes : new ArrayList<>());
        map.put("duration", duration);
        map.put("allowGuests", allowGuests);
        map.put("status", status);
        map.put("createdAt", createdAt);
        map.put("creatorId", creatorId);
        map.put("acceptorId", acceptorId);
        map.put("paid", paid);
        map.put("startDate", startDate);
        map.put("endDate", endDate);
        map.put("invitedUserId", invitedUserId);
        map.put("shareLink", shareLink);
        map.put("participants", participants != null ? participants : new ArrayList<>());
        map.put("invitePermission", invitePermission != null ? invitePermission : "CREATOR_ONLY");
        map.put("maxParticipants", maxParticipants);
        map.put("winnerId", winnerId);
        // NOVO
        map.put("mealsPerDay", mealsPerDay);
        map.put("mealCountPerDay", mealCountPerDay != null ? mealCountPerDay : mealsPerDay);
        map.put("proofsPerDay", proofsPerDay);
        map.put("customMinKm", customMinKm);
        map.put("customMinTimeMinutes", customMinTimeMinutes);
        map.put("customMinCount", customMinCount);
        map.put("minMealIntervalMinutes", minMealIntervalMinutes); // NOVO
        map.put("paidUserIds", paidUserIds != null ? paidUserIds : new ArrayList<>()); // NOVO
        map.put("participationFeePercent", participationFeePercent != null ? participationFeePercent : 15.0); // NOVO
        map.put("creatorParticipates", creatorParticipates != null ? creatorParticipates : true); // NOVO
        map.put("bannedUserIds", bannedUserIds != null ? bannedUserIds : new ArrayList<>()); // NOVO

        // NOVO: infos de pedido de encerramento
        map.put("finishRequestAt", finishRequestAt);
        map.put("finishRequestBy", finishRequestBy);
        map.put("finishAcceptedUserIds", finishAcceptedUserIds != null ? finishAcceptedUserIds : new ArrayList<>());
        map.put("finishRequestActive", finishRequestActive != null ? finishRequestActive : false);
        return map;
    }
    
    // Método helper para criar Challenge a partir de Map
    public static Challenge fromMap(java.util.Map<String, Object> map) {
        Challenge challenge = new Challenge();
        if (map.get("id") != null) {
            challenge.setId(((Number) map.get("id")).longValue());
        }
        challenge.setDescription((String) map.get("description"));
        challenge.setAmount(((Number) map.get("amount")).doubleValue());
        challenge.setType((String) map.getOrDefault("type", "custom"));
        challenge.setIcon((String) map.get("icon"));
        if (map.get("minWorkoutMinutes") != null) {
            challenge.setMinWorkoutMinutes(((Number) map.get("minWorkoutMinutes")).intValue());
        }
        Object customProofTypesObj = map.get("customProofTypes");
        if (customProofTypesObj instanceof List) {
            @SuppressWarnings("unchecked")
            List<String> customProofTypesList = (List<String>) customProofTypesObj;
            challenge.setCustomProofTypes(customProofTypesList);
        } else if (customProofTypesObj != null) {
            challenge.setCustomProofTypes(new ArrayList<>());
        }
        if (map.get("duration") != null) {
            challenge.setDuration(((Number) map.get("duration")).intValue());
        }
        challenge.setAllowGuests((Boolean) map.getOrDefault("allowGuests", true));
        challenge.setStatus((String) map.getOrDefault("status", "NOT_STARTED"));
        if (map.get("createdAt") != null) {
            challenge.setCreatedAt(((Number) map.get("createdAt")).longValue());
        }
        challenge.setCreatorId((String) map.get("creatorId"));
        challenge.setAcceptorId((String) map.get("acceptorId"));
        challenge.setPaid((Boolean) map.getOrDefault("paid", false));
        if (map.get("startDate") != null) {
            challenge.setStartDate(((Number) map.get("startDate")).longValue());
        }
        if (map.get("endDate") != null) {
            challenge.setEndDate(((Number) map.get("endDate")).longValue());
        }
        challenge.setInvitedUserId((String) map.get("invitedUserId"));
        challenge.setShareLink((String) map.get("shareLink"));
        Object participantsObj = map.get("participants");
        if (participantsObj instanceof List) {
            @SuppressWarnings("unchecked")
            List<String> participantsList = (List<String>) participantsObj;
            challenge.setParticipants(participantsList);
        } else if (participantsObj != null) {
            challenge.setParticipants(new ArrayList<>());
        }
        challenge.setInvitePermission((String) map.getOrDefault("invitePermission", "CREATOR_ONLY"));
        if (map.get("maxParticipants") != null) {
            challenge.setMaxParticipants(((Number) map.get("maxParticipants")).intValue());
        }
        challenge.setWinnerId((String) map.get("winnerId"));
        // NOVO leitura segura
        Object mealsPerDayObj = map.get("mealsPerDay");
        if (mealsPerDayObj instanceof Number) {
            challenge.setMealsPerDay(((Number) mealsPerDayObj).intValue());
        }
        Object mealCountPerDayObj = map.get("mealCountPerDay");
        if (mealCountPerDayObj instanceof Number) {
            challenge.setMealCountPerDay(((Number) mealCountPerDayObj).intValue());
            if (challenge.getMealsPerDay() == null) {
                challenge.setMealsPerDay(challenge.getMealCountPerDay());
            }
        }
        Object proofsPerDayObj = map.get("proofsPerDay");
        if (proofsPerDayObj instanceof Number) {
            challenge.setProofsPerDay(((Number) proofsPerDayObj).intValue());
        }
        Object customMinKmObj = map.get("customMinKm");
        if (customMinKmObj instanceof Number) {
            challenge.setCustomMinKm(((Number) customMinKmObj).doubleValue());
        }
        Object customMinTimeObj = map.get("customMinTimeMinutes");
        if (customMinTimeObj instanceof Number) {
            challenge.setCustomMinTimeMinutes(((Number) customMinTimeObj).intValue());
        }
        Object customMinCountObj = map.get("customMinCount");
        if (customMinCountObj instanceof Number) {
            challenge.setCustomMinCount(((Number) customMinCountObj).intValue());
        }
        Object minMealIntervalObj = map.get("minMealIntervalMinutes"); // NOVO
        if (minMealIntervalObj instanceof Number) {
            challenge.setMinMealIntervalMinutes(((Number) minMealIntervalObj).intValue());
        }
        Object paidUsersObj = map.get("paidUserIds"); // NOVO
        if (paidUsersObj instanceof List) {
            @SuppressWarnings("unchecked")
            List<String> paidList = (List<String>) paidUsersObj;
            challenge.setPaidUserIds(paidList);
        }
        Object feePercentObj = map.get("participationFeePercent"); // NOVO
        if (feePercentObj instanceof Number) {
            challenge.setParticipationFeePercent(((Number) feePercentObj).doubleValue());
        }
        Object creatorParticipatesObj = map.get("creatorParticipates"); // NOVO
        if (creatorParticipatesObj instanceof Boolean) {
            challenge.setCreatorParticipates((Boolean) creatorParticipatesObj);
        } else if (creatorParticipatesObj == null) {
            challenge.setCreatorParticipates(true);
        }
        Object bannedUsersObj = map.get("bannedUserIds"); // NOVO
        if (bannedUsersObj instanceof List) {
            @SuppressWarnings("unchecked")
            List<String> bannedList = (List<String>) bannedUsersObj;
            challenge.setBannedUserIds(bannedList);
        }

        // NOVO: carregar pedido de encerramento, se vier do mapa
        Object frAt = map.get("finishRequestAt");
        if (frAt instanceof Number) challenge.setFinishRequestAt(((Number) frAt).longValue());
        challenge.setFinishRequestBy((String) map.get("finishRequestBy"));
        Object frList = map.get("finishAcceptedUserIds");
        if (frList instanceof List) {
            @SuppressWarnings("unchecked")
            List<String> lst = (List<String>) frList;
            challenge.setFinishAcceptedUserIds(lst);
        }
        Object frActive = map.get("finishRequestActive");
        if (frActive instanceof Boolean) {
            challenge.setFinishRequestActive((Boolean) frActive);
        }

        return challenge;
    }
}

