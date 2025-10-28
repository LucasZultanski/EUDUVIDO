package com.example.service1.application;

import com.example.service1.domain.Challenge;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ChallengeServiceTest {
    @Test
    void testAddAndGetChallenges() {
        ChallengeService service = new ChallengeService();
        Challenge challenge = new Challenge("1", "Test Challenge");

        service.addChallenge(challenge);
        List<Challenge> challenges = service.getAllChallenges();

        assertEquals(1, challenges.size());
        assertEquals("Test Challenge", challenges.get(0).getDescription());
    }
}