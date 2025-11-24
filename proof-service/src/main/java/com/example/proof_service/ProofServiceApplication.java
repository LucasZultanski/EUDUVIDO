package com.example.proof_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;

@SpringBootApplication
@EntityScan(basePackages = "com.example.proof_service.model") // Adicionado para garantir scan das entidades
public class ProofServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(ProofServiceApplication.class, args);
	}

}
