package com.example.proof_service.repository;

import com.example.proof_service.model.Proof;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProofRepository extends JpaRepository<Proof, Long> {
    List<Proof> findByChallengeId(Long challengeId);
    List<Proof> findByChallengeIdString(String challengeIdString);
}
