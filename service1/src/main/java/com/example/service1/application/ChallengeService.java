package com.example.service1.application;

import com.example.service1.domain.Challenge;

import java.util.ArrayList;
import java.util.List;

public class ChallengeService {
    private final List<Challenge> challenges = new ArrayList<>();

    public List<Challenge> getAllChallenges() {
        return challenges;
    }

    public void addChallenge(Challenge challenge) {
        challenges.add(challenge);
    }
}