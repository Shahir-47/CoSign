package com.cosign.backend.dto;

import com.cosign.backend.model.TaskPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class TaskRequest {
    @NotBlank
    private String title;

    private String description;

    @NotNull
    private LocalDateTime deadline;

    @NotBlank
    private String verifierEmail;

    private String tags;
    private Long listId;

    private TaskPriority priority;
    private String location;
    private String repeatPattern;
    private boolean starred;

    // Either penaltyContent OR penaltyAttachments must be provided (validated in service)
    private String penaltyContent;

    private List<AttachmentDto> penaltyAttachments;

    @Data
    public static class AttachmentDto {
        private String s3Key;
        private String originalFilename;
        private String mimeType;
        private String contentHash; // SHA-256 hash of file content for duplicate detection
    }
}