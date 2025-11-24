package com.example.proof_service.config;

import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    public Map<String, Object> handle(Exception ex) {
        System.err.println("[GLOBAL][ERROR] " + ex.getClass().getSimpleName() + ": " + ex.getMessage());
        ex.printStackTrace();
        return Map.of(
                "error", true,
                "message", "Falha interna",
                "detail", ex.getClass().getSimpleName()
        );
    }
}
