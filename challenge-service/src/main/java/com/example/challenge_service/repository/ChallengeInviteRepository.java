package com.example.challenge_service.repository;

import com.example.challenge_service.model.ChallengeInvite;
import com.example.challenge_service.model.ChallengeInvite.InviteStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChallengeInviteRepository extends JpaRepository<ChallengeInvite, UUID> {

    List<ChallengeInvite> findByInviteeIdAndStatus(String inviteeId, InviteStatus status);

    Optional<ChallengeInvite> findByChallengeIdAndInviteeIdAndStatus(Long challengeId, String inviteeId, InviteStatus status);

    List<ChallengeInvite> findByChallengeIdAndStatus(Long challengeId, InviteStatus status);

    List<ChallengeInvite> findByChallengeId(Long challengeId);
}
