package com.example.auth_service.domain.user.vo;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@NoArgsConstructor
public class Role {

    @Getter
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 10)
    private RoleType value;

    public Role(RoleType value) {
        if (value == null) {
            throw new IllegalArgumentException("Role deve ser definida");
        }

        this.value = value;
    }

    public static Role of(RoleType value) {
        return new Role(value);
    }

    public boolean covers(RoleType role) {
        return this.value.covers(role);
    }
}
