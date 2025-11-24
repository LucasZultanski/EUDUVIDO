package com.example.auth_service.infrastructure.persistence;

import com.example.auth_service.domain.user.User;
import com.example.auth_service.domain.user.UserRepository;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public class JpaUserRepository implements UserRepository {
    private final SpringDataUserJpa jpa;
    private final EntityManager entityManager;

    public JpaUserRepository(SpringDataUserJpa jpa, EntityManager entityManager) {
        this.jpa = jpa;
        this.entityManager = entityManager;
    }

    @Override
    public boolean existsByEmail(String email) {
        return jpa.existsByEmail_value(email);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return jpa.findByEmail_value(email);
    }

    @Override
    public User save(User user) {
        User saved = jpa.save(user);
        entityManager.flush();
        return saved;
    }

    @Override
    public Optional<User> findById(UUID id) {
        return jpa.findById(id);
    }

    @Override
    public Page<User> findAll(Pageable pageable) {
        return jpa.findAll(pageable);
    }

    @Override
    public void delete(User user) {
        jpa.delete(user);
        entityManager.flush();
    }
}
