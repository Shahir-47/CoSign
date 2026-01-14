package com.cosign.backend.dto;

import com.cosign.backend.model.TaskPriority;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class TaskRequest {
    @NotBlank
    private String title;

    private String description;

    @NotNull
    @Future(message = "Deadline must be in the future")
    private LocalDateTime deadline;

    @NotBlank
    private String verifierEmail;

    private String tags;
    private Long listId;

    private TaskPriority priority;
    private String location;
    private String repeatPattern;
    private boolean starred;
}