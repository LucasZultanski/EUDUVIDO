package com.example.challenge_service.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "challenge_invite")
@Data
@NoArgsConstructor
public class ChallengeInvite {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private Long challengeId;

    @Column(nullable = false)
    private String inviterId;

    @Column(nullable = false)
    private String inviteeId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InviteStatus status = InviteStatus.PENDING;

    @Column(nullable = false)
    private Long createdAt = System.currentTimeMillis();

    private Long respondedAt;

    public enum InviteStatus {
        PENDING,
        ACCEPTED,
        DECLINED,
        EXPIRED
    }
}
