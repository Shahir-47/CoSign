package com.cosign.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SuperviseeResponse {
    private Long id;
    private String fullName;
    private String email;
    private String profilePictureUrl;
    
    @JsonProperty("isOnline")
    private boolean isOnline;
    
    private int pendingProofCount;      // Tasks waiting for them to submit proof
    private int pendingVerificationCount; // Tasks waiting for your review
    private int completedCount;         // Tasks you've approved
    private int totalTaskCount;         // Total tasks assigned to you by this user
}
