package com.example.auth_service.domain.user;

import com.example.auth_service.domain.user.vo.Email;
import com.example.auth_service.domain.user.vo.Role;
import com.example.auth_service.domain.user.vo.RoleType;
import jakarta.persistence.*;
import jakarta.validation.Valid;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Table(name = "usuario")
@Entity
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @Column(nullable = false, updatable = false)
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String password;

    @Valid
    @Embedded
    private Email email;

    @Embedded
    private Role role;

    @Column(columnDefinition = "TEXT")
    private String profilePicture; // Base64 da foto de perfil

    @Column
    private String birthDate;

    @Column(columnDefinition = "TEXT")
    private String encryptedCardData;

    public User(String name, String password, @Valid Email email, RoleType role) {
        this.name = name;
        this.password = password;
        this.email = email;
        this.role = Role.of(role);
    }
}
