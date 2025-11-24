package com.example.friend_service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

@Service
public class UserService {
    
    private final RestTemplate restTemplate;
    
    @Value("${auth.service.url:http://localhost:8081}")
    private String authServiceUrl;
    
    public UserService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }
    
    public Map<String, Object> getUserById(String userId, String token) {
        try {
            HttpHeaders headers = new HttpHeaders();
            if (token != null) {
                // O token já pode conter "Bearer " ou não, então verifica
                if (token.startsWith("Bearer ")) {
                    headers.set("Authorization", token);
                } else {
                    headers.set("Authorization", "Bearer " + token);
                }
            }
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                authServiceUrl + "/api/users/" + userId,
                HttpMethod.GET,
                entity,
                new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
        } catch (Exception e) {
            // Usuário não encontrado ou erro na comunicação
        }
        return null;
    }
    
    public Map<String, Object> getUserByUsername(String username, String token) {
        try {
            // Usa o endpoint específico de busca por username exato
            HttpHeaders headers = new HttpHeaders();
            if (token != null) {
                // O token já pode conter "Bearer " ou não, então verifica
                if (token.startsWith("Bearer ")) {
                    headers.set("Authorization", token);
                } else {
                    headers.set("Authorization", "Bearer " + token);
                }
            }
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            // Usa UriComponentsBuilder para construir a URL corretamente sem duplo encoding
            String trimmedUsername = username.trim();
            String url = UriComponentsBuilder.fromHttpUrl(authServiceUrl)
                    .path("/api/users/by-username/{username}")
                    .buildAndExpand(trimmedUsername)
                    .toUriString();
            
            System.out.println("Buscando usuário por username: " + trimmedUsername + " (URL: " + url + ")");
            
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
        } catch (org.springframework.web.client.HttpClientErrorException.NotFound e) {
            // Usuário não encontrado - retorna null
            System.out.println("Usuário não encontrado: " + username);
            return null;
        } catch (org.springframework.web.client.ResourceAccessException e) {
            // Erro de conexão - auth-service não está rodando
            System.err.println("Erro de conexão com auth-service. Verifique se o serviço está rodando em " + authServiceUrl);
            System.err.println("Erro: " + e.getMessage());
            return null;
        } catch (Exception e) {
            // Erro na comunicação - loga e retorna null
            System.err.println("Erro ao buscar usuário por username: " + e.getMessage());
            e.printStackTrace();
        }
        return null;
    }
}

