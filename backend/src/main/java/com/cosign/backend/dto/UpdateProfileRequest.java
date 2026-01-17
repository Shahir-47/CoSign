package com.cosign.backend.dto;

import com.cosign.backend.validation.ValidTimezone;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    @NotBlank
    private String fullName;

    @NotBlank
    @ValidTimezone
    private String timezone;

    private String profilePictureKey; // Optional S3 key from upload
}