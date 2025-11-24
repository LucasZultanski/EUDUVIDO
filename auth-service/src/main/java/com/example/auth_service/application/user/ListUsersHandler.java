package com.example.auth_service.application.user;

import com.example.auth_service.domain.user.User;
import com.example.auth_service.domain.user.UserRepository;
import com.example.auth_service.interfaces.rest.dto.user.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ListUsersHandler {

    private final UserRepository userRepository;

    public Page<UserResponse> handle(Pageable pageable) {
        Page<User> page = userRepository.findAll(pageable);

        return page.map( user -> new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail().getValue(),
                user.getRole().getValue().name()
        ));
    }
}
