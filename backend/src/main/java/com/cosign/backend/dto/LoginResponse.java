package com.cosign.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private String email;
    private String fullName;
    private String timezone;
    private String profilePictureUrl;
}