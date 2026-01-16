package com.cosign.backend.dto;

import com.cosign.backend.model.TaskStatus;
import lombok.Data;
import java.util.List;

@Data
public class TaskDetailResponse {
    private Long id;
    private String title;
    private TaskStatus status;
    private String proofDescription;
    private String denialReason;
    private String approvalComment;
    private List<AttachmentViewDto> attachments;
    private String penaltyContent;
    private List<AttachmentViewDto> penaltyAttachments;

    @Data
    public static class AttachmentViewDto {
        private String filename;
        private String url; // PRESIGNED URL
        private String mimeType;
    }
}