package com.example.challenge_service.repository;

import com.example.challenge_service.model.Challenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChallengeRepository extends JpaRepository<Challenge, Long> {
    
    // Buscar desafios criados por um usuário
    List<Challenge> findByCreatorId(String creatorId);
    
    // Buscar desafios aceitos por um usuário
    List<Challenge> findByAcceptorId(String acceptorId);
    
    // Buscar desafios criados ou aceitos por um usuário
    List<Challenge> findByCreatorIdOrAcceptorId(String creatorId, String acceptorId);
    
    // Buscar desafios públicos (allowGuests = true)
    List<Challenge> findByAllowGuestsTrue();
    
    // Buscar desafio por shareLink
    java.util.Optional<Challenge> findByShareLink(String shareLink);
    
    // Buscar desafios onde o usuário é participante (na lista de participants)
    @org.springframework.data.jpa.repository.Query(
        value = "SELECT DISTINCT c.* FROM challenges c " +
                "INNER JOIN challenge_participants cp ON c.id = cp.challenge_id " +
                "WHERE cp.participant_id = :userId",
        nativeQuery = true
    )
    List<Challenge> findByParticipantsContaining(@org.springframework.data.repository.query.Param("userId") String userId);
}

