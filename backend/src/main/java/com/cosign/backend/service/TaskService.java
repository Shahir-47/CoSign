package com.cosign.backend.service;

import com.cosign.backend.dto.TaskRequest;
import com.cosign.backend.model.*;
import com.cosign.backend.repository.TaskListRepository;
import com.cosign.backend.repository.TaskRepository;
import com.cosign.backend.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.cosign.backend.dto.ProofSubmissionRequest;
import com.cosign.backend.dto.ReviewTaskRequest;
import com.cosign.backend.dto.TaskDetailResponse;
import com.cosign.backend.model.ProofAttachment;
import java.time.LocalDateTime;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final TaskListRepository taskListRepository;
    private final UserRepository userRepository;
    private final TaskListService taskListService;
    private final S3Service s3Service;
    private final SocketService socketService;

    public TaskService(TaskRepository taskRepository,
                       TaskListRepository taskListRepository,
                       UserRepository userRepository,
                       TaskListService taskListService,
                       S3Service s3Service,
                       SocketService socketService) {
        this.taskRepository = taskRepository;
        this.taskListRepository = taskListRepository;
        this.userRepository = userRepository;
        this.taskListService = taskListService;
        this.s3Service = s3Service;
        this.socketService = socketService;
    }

    @Transactional
    public Task createTask(TaskRequest request) {
        User creator = getCurrentUser();

        // Find Verifier
        User verifier = userRepository.findByEmail(request.getVerifierEmail())
                .orElseThrow(() -> new RuntimeException("Verifier not found with email: " + request.getVerifierEmail()));

        if (verifier.getId().equals(creator.getId())) {
            throw new RuntimeException("You cannot verify your own tasks. That defeats the purpose of CoSign!");
        }

        // Handle List
        TaskList list;
        if (request.getListId() != null) {
            list = taskListRepository.findByIdAndUser(request.getListId(), creator)
                    .orElseThrow(() -> new RuntimeException("List not found"));
        } else {
            list = taskListService.getOrCreateDefaultList(creator);
        }

        // Build Task
        Task task = new Task();
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setDeadline(request.getDeadline());
        task.setPriority(request.getPriority() != null ? request.getPriority() : TaskPriority.MEDIUM);
        task.setLocation(request.getLocation());
        task.setRepeatPattern(request.getRepeatPattern());
        task.setStarred(request.isStarred());
        task.setTags(request.getTags());

        task.setCreator(creator);
        task.setVerifier(verifier);
        task.setList(list);

        // Default status
        task.setStatus(TaskStatus.PENDING_PROOF);

        Task savedTask = taskRepository.save(task);

        // Notify verifier about the new task
        socketService.sendToUser(savedTask.getVerifier().getId(), "NEW_TASK_ASSIGNED", Map.of(
                "taskId", savedTask.getId(),
                "title", savedTask.getTitle(),
                "creatorName", savedTask.getCreator().getFullName()
        ));

        return savedTask;
    }

    public List<Task> getMyTasks() {
        return taskRepository.findByCreator(getCurrentUser());
    }

    public List<Task> getMyTasksByList(Long listId) {
        User user = getCurrentUser();
        TaskList list = taskListRepository.findByIdAndUser(listId, user)
                .orElseThrow(() -> new RuntimeException("List not found"));
        return taskRepository.findByCreatorAndList(user, list);
    }

    public List<Task> getTasksToVerify() {
        return taskRepository.findByVerifier(getCurrentUser());
    }

    private User getCurrentUser() {
        String email = Objects.requireNonNull(SecurityContextHolder.getContext().getAuthentication()).getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Authenticated user not found"));
    }

    @Transactional
    public Task reassignVerifier(Long taskId, String newVerifierEmail) {
        User user = getCurrentUser();

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        if (!task.getCreator().getId().equals(user.getId())) {
            throw new RuntimeException("Not authorized to modify this task");
        }

        // Validate Status
        if (task.getStatus() == TaskStatus.COMPLETED || task.getStatus() == TaskStatus.MISSED) {
            throw new RuntimeException("Cannot reassign a task that is already completed or missed.");
        }

        // Find new Verifier
        User newVerifier = userRepository.findByEmail(newVerifierEmail)
                .orElseThrow(() -> new RuntimeException("Verifier not found"));

        if (newVerifier.getId().equals(user.getId())) {
            throw new RuntimeException("Cannot assign yourself as verifier");
        }

        // Update Task
        task.setVerifier(newVerifier);

        // Resume Status
        // Check if the user has provided a description OR uploaded attachments
        boolean hasProof = (task.getProofDescription() != null && !task.getProofDescription().isEmpty())
                || (task.getProofAttachments() != null && !task.getProofAttachments().isEmpty());

        if (hasProof) {
            task.setStatus(TaskStatus.PENDING_VERIFICATION);
        } else {
            task.setStatus(TaskStatus.PENDING_PROOF);
        }

        Task savedTask = taskRepository.save(task);

        // Notify new verifier
        socketService.sendToUser(savedTask.getVerifier().getId(), "NEW_TASK_ASSIGNED", Map.of(
                "taskId", savedTask.getId(),
                "title", savedTask.getTitle(),
                "creatorName", savedTask.getCreator().getFullName()
        ));

        return savedTask;
    }

    // Submit Proof
    @Transactional
    public Task submitProof(Long taskId, ProofSubmissionRequest request) {
        User user = getCurrentUser();
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        if (!task.getCreator().getId().equals(user.getId())) {
            throw new RuntimeException("Only the task creator can submit proof.");
        }

        if (task.getStatus() != TaskStatus.PENDING_PROOF && task.getStatus() != TaskStatus.MISSED) {
            throw new RuntimeException("Task is not pending proof.");
        }

        // Update Description
        task.setProofDescription(request.getDescription());

        // Clear old attachments if re-submitting
        task.getProofAttachments().clear();

        // Add new Attachments
        if (request.getAttachments() != null) {
            for (ProofSubmissionRequest.AttachmentDto dto : request.getAttachments()) {
                ProofAttachment attachment = new ProofAttachment();
                attachment.setS3Key(dto.getS3Key());
                attachment.setOriginalFilename(dto.getOriginalFilename());
                attachment.setMimeType(dto.getMimeType());
                attachment.setTask(task);
                task.getProofAttachments().add(attachment);
            }
        }

        task.setStatus(TaskStatus.PENDING_VERIFICATION);
        task.setSubmittedAt(LocalDateTime.now());
        Task savedTask = taskRepository.save(task);

        // notify verifier
        socketService.sendToUser(savedTask.getVerifier().getId(), "TASK_UPDATED", Map.of(
                "taskId", savedTask.getId(),
                "status", "PENDING_VERIFICATION",
                "message", "Proof submitted for: " + savedTask.getTitle(),
                "updatedBy", savedTask.getCreator().getFullName()
        ));

        return savedTask;
    }

    // Review Proof
    @Transactional
    public Task reviewProof(Long taskId, ReviewTaskRequest request) {
        User verifier = getCurrentUser();
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        if (!task.getVerifier().getId().equals(verifier.getId())) {
            throw new RuntimeException("You are not the designated verifier for this task.");
        }

        if (task.getStatus() != TaskStatus.PENDING_VERIFICATION) {
            throw new RuntimeException("This task is not waiting for verification.");
        }

        if (request.getApproved()) {
            // ACCEPT
            task.setStatus(TaskStatus.COMPLETED);
            LocalDateTime now = LocalDateTime.now();
            task.setVerifiedAt(now);
            task.setCompletedAt(now);
            task.setApprovalComment(request.getComment());
            task.setDenialReason(null); // Clear previous denials
        } else {
            // DENY
            if (request.getComment() == null || request.getComment().trim().isEmpty()) {
                throw new RuntimeException("A reason is required when denying proof.");
            }
            task.setStatus(TaskStatus.PENDING_PROOF); // Send back to user
            task.setDenialReason(request.getComment());
            task.setRejectedAt(LocalDateTime.now());
        }

        Task savedTask = taskRepository.save(task);

        // Notify Creator
        String message = request.getApproved()
                ? "Task Verified: " + savedTask.getTitle()
                : "Proof Rejected: " + savedTask.getTitle();

        socketService.sendToUser(savedTask.getCreator().getId(), "TASK_UPDATED", Map.of(
                "taskId", savedTask.getId(),
                "status", savedTask.getStatus().toString(),
                "message", message,
                "approved", request.getApproved(),
                "denialReason", savedTask.getDenialReason() != null ? savedTask.getDenialReason() : ""
        ));

        return savedTask;
    }

    // Get Task Details
    public TaskDetailResponse getTaskDetails(Long taskId) {
        User user = getCurrentUser();
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        // Only Creator or Verifier can see details
        boolean isCreator = task.getCreator().getId().equals(user.getId());
        boolean isVerifier = task.getVerifier().getId().equals(user.getId());

        if (!isCreator && !isVerifier) {
            throw new RuntimeException("Not authorized to view this task.");
        }

        TaskDetailResponse response = new TaskDetailResponse();
        response.setId(task.getId());
        response.setTitle(task.getTitle());
        response.setStatus(task.getStatus());
        response.setProofDescription(task.getProofDescription());
        response.setDenialReason(task.getDenialReason());
        response.setApprovalComment(task.getApprovalComment());

        // Convert attachments to View DTOs with Presigned URLs
        List<TaskDetailResponse.AttachmentViewDto> attachmentDtos = task.getProofAttachments().stream()
                .map(att -> {
                    TaskDetailResponse.AttachmentViewDto dto = new TaskDetailResponse.AttachmentViewDto();
                    dto.setFilename(att.getOriginalFilename());
                    dto.setMimeType(att.getMimeType());
                    // GENERATES SECURE URL
                    dto.setUrl(s3Service.generatePresignedDownloadUrl(att.getS3Key()));
                    return dto;
                }).collect(Collectors.toList());

        response.setAttachments(attachmentDtos);

        return response;
    }
}