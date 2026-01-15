package com.cosign.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ReviewTaskRequest {
    @NotNull
    private Boolean approved;

    private String comment;
}