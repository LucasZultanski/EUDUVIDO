package com.example.friend_service.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "friend_request",
    indexes = {
        @Index(name = "idx_friend_request_sender", columnList = "senderId"),
        @Index(name = "idx_friend_request_receiver", columnList = "receiverId"),
        @Index(name = "idx_friend_request_status", columnList = "status"),
        @Index(name = "idx_friend_request_sender_status", columnList = "senderId,status"),
        @Index(name = "idx_friend_request_receiver_status", columnList = "receiverId,status")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FriendRequest {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(nullable = false)
    private String senderId;
    
    @Column(nullable = false)
    private String receiverId;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestStatus status;
    
    @Column(nullable = false)
    private LocalDateTime createdAt;
    
    private LocalDateTime respondedAt;
    
    public enum RequestStatus {
        PENDING,
        ACCEPTED,
        REJECTED
    }
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) {
            status = RequestStatus.PENDING;
        }
    }
}

