package com.cosign.backend.dto;

import com.cosign.backend.model.TaskPriority;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * DTO for updating existing tasks.
 * Unlike TaskRequest, this doesn't validate deadline as @Future since
 * we may be updating other fields on tasks with past deadlines.
 */
@Data
public class TaskUpdateRequest {
    private String title;
    private String description;
    private LocalDateTime deadline;
    private String tags;
    private TaskPriority priority;
    private String location;
    private String repeatPattern;
    private Boolean starred;
}
