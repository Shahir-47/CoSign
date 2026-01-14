package com.cosign.backend.service;

import com.cosign.backend.dto.TaskRequest;
import com.cosign.backend.model.*;
import com.cosign.backend.repository.TaskListRepository;
import com.cosign.backend.repository.TaskRepository;
import com.cosign.backend.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final TaskListRepository taskListRepository;
    private final UserRepository userRepository;
    private final TaskListService taskListService;

    public TaskService(TaskRepository taskRepository, 
                       TaskListRepository taskListRepository,
                       UserRepository userRepository,
                       TaskListService taskListService) {
        this.taskRepository = taskRepository;
        this.taskListRepository = taskListRepository;
        this.userRepository = userRepository;
        this.taskListService = taskListService;
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

        return taskRepository.save(task);
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
        // If they had already uploaded proof, go back to PENDING_VERIFICATION
        // Otherwise, go back to PENDING_PROOF
        if (task.getProofUrl() != null && !task.getProofUrl().isEmpty()) {
            task.setStatus(TaskStatus.PENDING_VERIFICATION);
        } else {
            task.setStatus(TaskStatus.PENDING_PROOF);
        }

        return taskRepository.save(task);
    }
}