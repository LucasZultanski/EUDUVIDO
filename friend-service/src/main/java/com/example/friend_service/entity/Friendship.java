package com.example.friend_service.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "friendship", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user1Id", "user2Id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Friendship {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(nullable = false)
    private String user1Id;
    
    @Column(nullable = false)
    private String user2Id;
    
    @Column(nullable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}

