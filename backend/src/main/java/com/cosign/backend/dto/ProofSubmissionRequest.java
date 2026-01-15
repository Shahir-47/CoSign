package com.cosign.backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class ProofSubmissionRequest {
    private String description;
    private List<AttachmentDto> attachments;

    @Data
    public static class AttachmentDto {
        private String s3Key;
        private String originalFilename;
        private String mimeType;
    }
}