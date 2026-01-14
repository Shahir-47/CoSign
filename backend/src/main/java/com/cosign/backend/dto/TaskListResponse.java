package com.cosign.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TaskListResponse {
    private Long id;
    private String name;
    private String colorHex;
    private String icon;
    private boolean isDefault;
    private int taskCount;
}
