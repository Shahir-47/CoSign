package com.cosign.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TaskListRequest {
    @NotBlank
    private String name;
    
    private String colorHex;
    
    private String icon;
}
