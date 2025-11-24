package com.example.auth_service.interfaces.rest;

import com.example.auth_service.application.user.ListUsersHandler;
import com.example.auth_service.application.user.RegisterUserHandler;
import com.example.auth_service.domain.user.User;
import com.example.auth_service.domain.user.UserRepository;
import com.example.auth_service.domain.user.vo.Email;
import com.example.auth_service.interfaces.rest.dto.user.UserRequest;
import com.example.auth_service.interfaces.rest.dto.user.UserResponse;
import com.auth0.jwt.JWT;
import com.auth0.jwt.interfaces.DecodedJWT;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final ListUsersHandler list;
    private final RegisterUserHandler register;
    private final UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                DecodedJWT jwt = JWT.decode(token);
                
                // O subject do JWT contém o ID do usuário
                String userIdStr = jwt.getSubject();
                UUID userId = UUID.fromString(userIdStr);
                
                Optional<User> userOpt = userRepository.findById(userId);
                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    return ResponseEntity.ok(Map.of(
                        "id", user.getId().toString(),
                        "name", user.getName(),
                        "username", user.getName(),
                        "email", user.getEmail().getValue(),
                        "avatar", user.getProfilePicture() != null ? user.getProfilePicture() : "",
                        "profilePicture", user.getProfilePicture() != null ? user.getProfilePicture() : "",
                        "birthDate", user.getBirthDate() != null ? user.getBirthDate() : "",
                        "encryptedCardData", user.getEncryptedCardData() != null ? user.getEncryptedCardData() : ""
                    ));
                } else {
                    return ResponseEntity.status(401).body(Map.of("error", "Usuário não encontrado"));
                }
            } catch (Exception e) {
                // Token inválido, retorna erro 401
                return ResponseEntity.status(401).body(Map.of("error", "Token inválido: " + e.getMessage()));
            }
        }
        
        // Retorna erro 401 se não houver token
        return ResponseEntity.status(401).body(Map.of("error", "Token não fornecido"));
    }

    @PatchMapping("/me")
    public ResponseEntity<?> updateProfile(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> updates) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                DecodedJWT jwt = JWT.decode(token);
                
                // O subject do JWT contém o ID do usuário
                String userIdStr = jwt.getSubject();
                UUID userId = UUID.fromString(userIdStr);
                
                Optional<User> userOpt = userRepository.findById(userId);
                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    
                    // Atualizar nome se fornecido
                    if (updates.containsKey("name")) {
                        Object nameObj = updates.get("name");
                        if (nameObj != null) {
                            String name = nameObj.toString().trim();
                            if (name.isEmpty()) {
                                return ResponseEntity.badRequest().body(Map.of("error", "Nome não pode estar vazio"));
                            }
                            user.setName(name);
                        }
                    }
                    
                    // Atualizar email se fornecido
                    if (updates.containsKey("email")) {
                        Object emailObj = updates.get("email");
                        if (emailObj != null) {
                            String emailRaw = emailObj.toString().trim();
                            if (emailRaw.isEmpty()) {
                                return ResponseEntity.badRequest().body(Map.of("error", "Email não pode estar vazio"));
                            }
                            
                            // Verificar se o email já está em uso por outro usuário
                            Optional<User> existingUser = userRepository.findByEmail(emailRaw);
                            if (existingUser.isPresent() && !existingUser.get().getId().equals(userId)) {
                                return ResponseEntity.badRequest().body(Map.of("error", "Este email já está em uso por outro usuário"));
                            }
                            
                            // Criar novo objeto Email e atualizar
                            try {
                                Email newEmail = Email.of(emailRaw);
                                user.setEmail(newEmail);
                            } catch (Exception e) {
                                return ResponseEntity.badRequest().body(Map.of("error", "Email inválido: " + e.getMessage()));
                            }
                        }
                    }
                    
                    // Atualizar foto de perfil se fornecida
                    if (updates.containsKey("profilePicture")) {
                        Object profilePictureObj = updates.get("profilePicture");
                        if (profilePictureObj != null) {
                            String profilePicture = profilePictureObj.toString();
                            // Remover prefixo data:image se existir
                            if (profilePicture.contains(",")) {
                                profilePicture = profilePicture.split(",")[1];
                            }
                            user.setProfilePicture(profilePicture);
                        } else {
                            user.setProfilePicture(null);
                        }
                    }
                    
                    // Atualizar data de nascimento se fornecida
                    if (updates.containsKey("birthDate")) {
                        Object birthDateObj = updates.get("birthDate");
                        user.setBirthDate(birthDateObj != null ? birthDateObj.toString() : null);
                    }
                    
                    // Atualizar dados do cartão criptografado se fornecidos
                    if (updates.containsKey("encryptedCardData")) {
                        Object encryptedCardDataObj = updates.get("encryptedCardData");
                        user.setEncryptedCardData(encryptedCardDataObj != null ? encryptedCardDataObj.toString() : null);
                    }
                    
                    // Salvar no banco de dados
                    userRepository.save(user);
                    
                    return ResponseEntity.ok(Map.of("message", "Perfil atualizado com sucesso"));
                } else {
                    return ResponseEntity.status(401).body(Map.of("error", "Usuário não encontrado"));
                }
            } catch (Exception e) {
                return ResponseEntity.status(401).body(Map.of("error", "Token inválido: " + e.getMessage()));
            }
        }
        
        return ResponseEntity.status(401).body(Map.of("error", "Token não fornecido"));
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(
            @RequestParam String query,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String currentUserId = null;
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                try {
                    String token = authHeader.substring(7);
                    DecodedJWT jwt = JWT.decode(token);
                    currentUserId = jwt.getSubject();
                } catch (Exception e) {
                    // Ignora erro de token, apenas não filtra o usuário atual
                }
            }
            
            final String finalCurrentUserId = currentUserId;
            
            // Busca usuários pelo nome (username) que contenham a query
            List<User> users = userRepository.findAll(org.springframework.data.domain.Pageable.unpaged())
                    .getContent()
                    .stream()
                    .filter(user -> {
                        // Não retorna o próprio usuário
                        if (finalCurrentUserId != null && user.getId().toString().equals(finalCurrentUserId)) {
                            return false;
                        }
                        // Busca por nome (username)
                        String name = user.getName().toLowerCase();
                        String queryLower = query.toLowerCase();
                        return name.contains(queryLower);
                    })
                    .limit(10) // Limita a 10 resultados
                    .collect(java.util.stream.Collectors.toList());
            
            // Converte para formato de resposta
            List<Map<String, Object>> result = users.stream()
                    .map(user -> {
                        Map<String, Object> userMap = new java.util.HashMap<>();
                        userMap.put("id", user.getId().toString());
                        userMap.put("username", user.getName());
                        userMap.put("email", user.getEmail().getValue());
                        userMap.put("profilePicture", user.getProfilePicture() != null ? user.getProfilePicture() : "");
                        return userMap;
                    })
                    .collect(java.util.stream.Collectors.toList());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Erro ao buscar usuários: " + e.getMessage()));
        }
    }

    @GetMapping("/by-username/{username}")
    public ResponseEntity<?> getUserByUsername(
            @PathVariable String username,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            // O Spring já decodifica automaticamente o path variable, então não precisa fazer decode manual
            String searchName = username.trim();
            
            // Busca todos os usuários e filtra por nome exato (case-insensitive)
            List<User> users = userRepository.findAll(org.springframework.data.domain.Pageable.unpaged())
                    .getContent()
                    .stream()
                    .filter(user -> user.getName().trim().equalsIgnoreCase(searchName))
                    .collect(java.util.stream.Collectors.toList());
            
            if (users.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Usuário não encontrado"));
            }
            
            // Retorna o primeiro usuário encontrado (deve ser único por nome)
            User user = users.get(0);
            return ResponseEntity.ok(Map.of(
                "id", user.getId().toString(),
                "username", user.getName(),
                "name", user.getName(),
                "email", user.getEmail().getValue(),
                "profilePicture", user.getProfilePicture() != null ? user.getProfilePicture() : ""
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Erro ao buscar usuário: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable UUID id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            return ResponseEntity.ok(Map.of(
                "id", user.getId().toString(),
                "username", user.getName(),
                "name", user.getName(),
                "email", user.getEmail().getValue(),
                "profilePicture", user.getProfilePicture() != null ? user.getProfilePicture() : ""
            ));
        }
        return ResponseEntity.status(404).body(Map.of("error", "Usuário não encontrado"));
    }

    @GetMapping()
    public ResponseEntity<Page<UserResponse>> list(Pageable pageable) {
        Page<UserResponse> page = list.handle(pageable);

        return ResponseEntity.ok(page);
    }

    @PostMapping
    public ResponseEntity<UserResponse> create(@Valid @RequestBody UserRequest user) {
        UserResponse created = register.handle(user.name(), user.email(), user.password());

        return ResponseEntity.created(URI.create("users/" + created.id())).body(created);
    }

    @DeleteMapping("/me")
    public ResponseEntity<?> deleteAccount(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                DecodedJWT jwt = JWT.decode(token);
                
                // O subject do JWT contém o ID do usuário
                String userIdStr = jwt.getSubject();
                UUID userId = UUID.fromString(userIdStr);
                
                Optional<User> userOpt = userRepository.findById(userId);
                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    
                    // Apagar o usuário do banco de dados
                    // Nota: Em produção, você pode querer fazer soft delete ou manter alguns dados por questões legais
                    userRepository.delete(user);
                    
                    return ResponseEntity.ok(Map.of("message", "Conta apagada com sucesso"));
                } else {
                    return ResponseEntity.status(401).body(Map.of("error", "Usuário não encontrado"));
                }
            } catch (Exception e) {
                return ResponseEntity.status(401).body(Map.of("error", "Token inválido: " + e.getMessage()));
            }
        }
        
        return ResponseEntity.status(401).body(Map.of("error", "Token não fornecido"));
    }}
