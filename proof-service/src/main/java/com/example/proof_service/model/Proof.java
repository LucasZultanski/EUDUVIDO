package com.example.proof_service.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import java.util.*;

@Entity
@Table(name = "proof") // Adiciona a anotação Table para garantir que JPA reconheça
public class Proof {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long challengeId;
    private String challengeIdString;
    private String description;
    private String imageUrl;
    private String userId;
    private String status;
    private Long timestamp;
    private Long createdAt;

    // Campos extras (opcional, adicione conforme necessário)
    @Column(columnDefinition = "TEXT")
    private String photos; // JSON/base64 array (para múltiplas fotos)
    @Column(columnDefinition = "TEXT")
    private String meals; // JSON string de refeições
    private Double distance;
    private Long studyTime;
    private String studyTimeFormatted;
    private String location;
    private Long checkinTime;
    private Long checkoutTime;
    private Long elapsedMinutes;

    // NOVO: campos para custom proof types
    @ElementCollection
    @CollectionTable(name = "proof_custom_types", joinColumns = @JoinColumn(name = "proof_id"))
    @Column(name = "type")
    private List<String> proofTypes = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "proof_custom_values", joinColumns = @JoinColumn(name = "proof_id"))
    @MapKeyColumn(name = "key")
    @Column(name = "value")
    private Map<String, String> proofValues = new HashMap<>();

    // NOVO: campos dieta
    private Integer mealCount;
    private Integer requiredMeals;
    private String date;

    // Getters e Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getChallengeId() { return challengeId; }
    public void setChallengeId(Long challengeId) { this.challengeId = challengeId; }

    public String getChallengeIdString() { return challengeIdString; }
    public void setChallengeIdString(String challengeIdString) { this.challengeIdString = challengeIdString; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getTimestamp() { return timestamp; }
    public void setTimestamp(Long timestamp) { this.timestamp = timestamp; }

    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }

    public String getPhotos() { return photos; }
    public void setPhotos(String photos) { this.photos = photos; }

    public String getMeals() { return meals; }
    public void setMeals(String meals) { this.meals = meals; }

    public Double getDistance() { return distance; }
    public void setDistance(Double distance) { this.distance = distance; }

    public Long getStudyTime() { return studyTime; }
    public void setStudyTime(Long studyTime) { this.studyTime = studyTime; }

    public String getStudyTimeFormatted() { return studyTimeFormatted; }
    public void setStudyTimeFormatted(String studyTimeFormatted) { this.studyTimeFormatted = studyTimeFormatted; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public Long getCheckinTime() { return checkinTime; }
    public void setCheckinTime(Long checkinTime) { this.checkinTime = checkinTime; }

    public Long getCheckoutTime() { return checkoutTime; }
    public void setCheckoutTime(Long checkoutTime) { this.checkoutTime = checkoutTime; }

    public Long getElapsedMinutes() { return elapsedMinutes; }
    public void setElapsedMinutes(Long elapsedMinutes) { this.elapsedMinutes = elapsedMinutes; }

    public List<String> getProofTypes() { return proofTypes; }
    public void setProofTypes(List<String> proofTypes) { this.proofTypes = proofTypes; }

    public Map<String, String> getProofValues() { return proofValues; }
    public void setProofValues(Map<String, String> proofValues) { this.proofValues = proofValues; }

    public Integer getMealCount() { return mealCount; }
    public void setMealCount(Integer mealCount) { this.mealCount = mealCount; }

    public Integer getRequiredMeals() { return requiredMeals; }
    public void setRequiredMeals(Integer requiredMeals) { this.requiredMeals = requiredMeals; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
}
