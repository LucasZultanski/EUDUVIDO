package com.example.friend_service.repository;

import com.example.friend_service.entity.FriendRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FriendRequestRepository extends JpaRepository<FriendRequest, UUID> {
    
    List<FriendRequest> findByReceiverIdAndStatus(String receiverId, FriendRequest.RequestStatus status);
    
    List<FriendRequest> findBySenderIdAndStatus(String senderId, FriendRequest.RequestStatus status);
    
    Optional<FriendRequest> findBySenderIdAndReceiverIdAndStatus(
        String senderId, 
        String receiverId, 
        FriendRequest.RequestStatus status
    );
    
    boolean existsBySenderIdAndReceiverIdAndStatus(
        String senderId, 
        String receiverId, 
        FriendRequest.RequestStatus status
    );
    
    List<FriendRequest> findBySenderIdOrReceiverId(String userId1, String userId2);

    Optional<FriendRequest> findByIdAndSenderIdAndStatus(UUID id, String senderId, FriendRequest.RequestStatus status);
}

