package com.example.challenge_service.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "winner_votes", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"challenge_id", "voter_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WinnerVote {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private Long challengeId;
    
    @Column(nullable = false)
    private String voterId; // ID do usuário que votou
    
    @Column(nullable = false)
    private String votedForId; // ID do usuário que recebeu o voto (vencedor)
    
    @Column(nullable = false)
    private Long createdAt;
}

