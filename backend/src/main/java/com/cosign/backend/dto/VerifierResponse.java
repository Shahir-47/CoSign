package com.cosign.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class VerifierResponse {
    private Long id;
    private String fullName;
    private String email;
    private String profilePictureUrl;
    
    @JsonProperty("isOnline")
    private boolean isOnline;

    // Constructor without isOnline for backward compatibility
    public VerifierResponse(Long id, String fullName, String email, String profilePictureUrl) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.profilePictureUrl = profilePictureUrl;
        this.isOnline = false;
    }
}