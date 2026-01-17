package com.cosign.backend.service;

import com.cosign.backend.dto.SuperviseeResponse;
import com.cosign.backend.dto.VerifierResponse;
import com.cosign.backend.model.Task;
import com.cosign.backend.model.TaskStatus;
import com.cosign.backend.model.User;
import com.cosign.backend.repository.TaskRepository;
import com.cosign.backend.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class VerifierService {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final SocketService socketService;
    private final S3Service s3Service;

    public VerifierService(UserRepository userRepository, TaskRepository taskRepository, SocketService socketService, S3Service s3Service) {
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
        this.socketService = socketService;
        this.s3Service = s3Service;
    }

    private User getCurrentUser() {
        String email = Objects.requireNonNull(SecurityContextHolder.getContext().getAuthentication()).getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Authenticated user not found"));
    }

    private String getPfpUrl(String key) {
        if (key == null) return null;
        return s3Service.generatePresignedDownloadUrl(key);
    }

    @Transactional
    public VerifierResponse addVerifier(String verifierEmail) {
        User currentUser = getCurrentUser();

        // Find the verifier account
        User verifier = userRepository.findByEmail(verifierEmail)
                .orElseThrow(() -> new RuntimeException("User with email " + verifierEmail + " not found. They must have a CoSign account."));

        // Ensure they have a verified email
        if (!verifier.isEmailVerified()) {
            throw new RuntimeException("This user has not verified their email address yet and cannot accept tasks.");
        }

        // Prevent adding self
        if (verifier.getId().equals(currentUser.getId())) {
            throw new RuntimeException("You cannot add yourself as a verifier.");
        }

        // Check if already a verifier
        boolean isNewVerifier = !currentUser.getSavedVerifiers().contains(verifier);

        // Add to set
        currentUser.getSavedVerifiers().add(verifier);
        userRepository.save(currentUser);

        // Notify the verifier via WebSocket
        if (isNewVerifier) {
            socketService.sendToUser(verifier.getId(), "VERIFIER_ADDED", java.util.Map.of(
                    "addedById", currentUser.getId(),
                    "addedByName", currentUser.getFullName(),
                    "addedByEmail", currentUser.getEmail(),
                    "addedByProfilePicture", currentUser.getProfilePictureUrl() != null ? currentUser.getProfilePictureUrl() : "",
                    "message", currentUser.getFullName() + " added you as their accountability partner"
            ));
        }

        return new VerifierResponse(
                verifier.getId(),
                verifier.getFullName(),
                verifier.getEmail(),
                getPfpUrl(verifier.getProfilePictureUrl()),
                socketService.isUserOnline(verifier.getId())
        );
    }

    @Transactional(readOnly = true)
    public List<VerifierResponse> getSavedVerifiers() {
        User currentUser = getCurrentUser();

        return currentUser.getSavedVerifiers().stream()
                .map(v -> new VerifierResponse(
                        v.getId(),
                        v.getFullName(),
                        v.getEmail(),
                        getPfpUrl(v.getProfilePictureUrl()),
                        socketService.isUserOnline(v.getId())
                ))
                .collect(Collectors.toList());
    }

    @Transactional
    public void removeVerifier(Long verifierId) {
        User currentUser = getCurrentUser();

        // Identify the verifier to be removed
        User verifierToRemove = currentUser.getSavedVerifiers().stream()
                .filter(u -> u.getId().equals(verifierId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Verifier not found in your list."));

        // Find active tasks tied to this verifier
        List<Task> activeTasks = taskRepository.findActiveTasksForVerifier(
                currentUser,
                verifierToRemove,
                LocalDateTime.now()
        );

        // Pause them and notify via WebSocket
        for (Task task : activeTasks) {
            task.setStatus(TaskStatus.PAUSED);
        }
        taskRepository.saveAll(activeTasks);

        // Send WebSocket notifications for each paused task
        for (Task task : activeTasks) {
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("taskId", task.getId());
            payload.put("status", TaskStatus.PAUSED.toString());
            payload.put("message", "Task paused - verifier removed: " + task.getTitle());

            socketService.sendToUser(currentUser.getId(), "TASK_UPDATED", payload);
        }

        // Remove the relationship
        currentUser.getSavedVerifiers().remove(verifierToRemove);
        userRepository.save(currentUser);

        // Notify the removed verifier via WebSocket
        socketService.sendToUser(verifierToRemove.getId(), "VERIFIER_REMOVED", java.util.Map.of(
                "removedById", currentUser.getId(),
                "removedByName", currentUser.getFullName(),
                "removedByEmail", currentUser.getEmail(),
                "message", currentUser.getFullName() + " removed you as their accountability partner"
        ));
    }

    /**
     * Get all users who have added the current user as their verifier (supervisees).
     * Includes task statistics for each supervisee.
     */
    @Transactional(readOnly = true)
    public List<SuperviseeResponse> getSupervisees() {
        User currentUser = getCurrentUser();

        // Find all users who have this user as a saved verifier
        List<User> supervisees = userRepository.findUsersBySavedVerifier(currentUser.getId());

        return supervisees.stream()
                .map(supervisee -> {
                    int pendingProofCount = taskRepository.countByVerifierAndCreatorAndStatus(
                            currentUser, supervisee, TaskStatus.PENDING_PROOF);
                    int pendingVerificationCount = taskRepository.countByVerifierAndCreatorAndStatus(
                            currentUser, supervisee, TaskStatus.PENDING_VERIFICATION);
                    int completedCount = taskRepository.countByVerifierAndCreatorAndStatus(
                            currentUser, supervisee, TaskStatus.COMPLETED);
                    int totalCount = taskRepository.countByVerifierAndCreator(currentUser, supervisee);

                    return new SuperviseeResponse(
                            supervisee.getId(),
                            supervisee.getFullName(),
                            supervisee.getEmail(),
                            getPfpUrl(supervisee.getProfilePictureUrl()),
                            socketService.isUserOnline(supervisee.getId()),
                            pendingProofCount,
                            pendingVerificationCount,
                            completedCount,
                            totalCount
                    );
                })
                .collect(Collectors.toList());
    }

}