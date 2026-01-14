package com.cosign.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class VerifierResponse {
    private Long id;
    private String fullName;
    private String email;
    private String profilePictureUrl;
}