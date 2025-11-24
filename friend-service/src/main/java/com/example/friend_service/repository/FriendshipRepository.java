package com.example.friend_service.repository;

import com.example.friend_service.entity.Friendship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, UUID> {
    
    @Query("SELECT f FROM Friendship f WHERE (f.user1Id = :userId OR f.user2Id = :userId)")
    List<Friendship> findByUserId(@Param("userId") String userId);
    
    @Query("SELECT f FROM Friendship f WHERE " +
           "(f.user1Id = :userId1 AND f.user2Id = :userId2) OR " +
           "(f.user1Id = :userId2 AND f.user2Id = :userId1)")
    Optional<Friendship> findByUserIds(@Param("userId1") String userId1, @Param("userId2") String userId2);
    
    boolean existsByUser1IdAndUser2Id(String userId1, String userId2);
    
    boolean existsByUser2IdAndUser1Id(String userId1, String userId2);
    
    @Query("SELECT CASE WHEN COUNT(f) > 0 THEN true ELSE false END FROM Friendship f WHERE " +
           "(f.user1Id = :userId1 AND f.user2Id = :userId2) OR " +
           "(f.user1Id = :userId2 AND f.user2Id = :userId1)")
    boolean existsFriendship(@Param("userId1") String userId1, @Param("userId2") String userId2);
}

