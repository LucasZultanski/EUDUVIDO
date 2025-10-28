package com.example.service1.infrastructure;

import com.example.service1.application.ChallengeService;
import com.example.service1.domain.Challenge;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/challenges")
public class ChallengeController {
    private final ChallengeService challengeService = new ChallengeService();

    @GetMapping
    public List<Challenge> getChallenges() {
        return challengeService.getAllChallenges();
    }

    @PostMapping
    public void addChallenge(@RequestBody Challenge challenge) {
        challengeService.addChallenge(challenge);
    }
}