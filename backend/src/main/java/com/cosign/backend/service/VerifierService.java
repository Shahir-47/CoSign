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
import java.util.stream.Collectors;

@Service
public class VerifierService {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final SocketService socketService;

    public VerifierService(UserRepository userRepository, TaskRepository taskRepository, SocketService socketService) {
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
        this.socketService = socketService;
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Authenticated user not found"));
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

        // Add to set
        currentUser.getSavedVerifiers().add(verifier);
        userRepository.save(currentUser);

        return new VerifierResponse(
                verifier.getId(),
                verifier.getFullName(),
                verifier.getEmail(),
                verifier.getProfilePictureUrl(),
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
                        v.getProfilePictureUrl(),
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

        // Pause them
        for (Task task : activeTasks) {
            task.setStatus(TaskStatus.PAUSED);
        }
        taskRepository.saveAll(activeTasks);

        // Remove the relationship
        currentUser.getSavedVerifiers().remove(verifierToRemove);
        userRepository.save(currentUser);
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
                            supervisee.getProfilePictureUrl(),
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