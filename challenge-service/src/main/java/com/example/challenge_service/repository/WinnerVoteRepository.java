package com.example.challenge_service.repository;

import com.example.challenge_service.model.WinnerVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WinnerVoteRepository extends JpaRepository<WinnerVote, Long> {
    
    List<WinnerVote> findByChallengeId(Long challengeId);
    
    Optional<WinnerVote> findByChallengeIdAndVoterId(Long challengeId, String voterId);
    
    long countByChallengeId(Long challengeId);
    
    List<WinnerVote> findByChallengeIdAndVotedForId(Long challengeId, String votedForId);
}

