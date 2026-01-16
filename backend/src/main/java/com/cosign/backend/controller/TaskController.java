package com.cosign.backend.controller;

import com.cosign.backend.dto.ProofSubmissionRequest;
import com.cosign.backend.dto.ReviewTaskRequest;
import com.cosign.backend.dto.TaskDetailResponse;
import com.cosign.backend.dto.TaskRequest;
import com.cosign.backend.dto.TaskUpdateRequest;
import com.cosign.backend.model.Task;
import com.cosign.backend.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PostMapping
    public ResponseEntity<Task> createTask(@Valid @RequestBody TaskRequest request) {
        Task createdTask = taskService.createTask(request);
        return ResponseEntity.ok(createdTask);
    }

    @GetMapping
    public ResponseEntity<List<Task>> getMyTasks(@RequestParam(required = false) Long listId) {
        if (listId != null) {
            return ResponseEntity.ok(taskService.getMyTasksByList(listId));
        }
        return ResponseEntity.ok(taskService.getMyTasks());
    }

    @GetMapping("/verification-requests")
    public ResponseEntity<List<Task>> getTasksToVerify() {
        return ResponseEntity.ok(taskService.getTasksToVerify());
    }

    @PutMapping("/{taskId}/reassign")
    public ResponseEntity<Task> reassignVerifier(
            @PathVariable Long taskId,
            @RequestBody java.util.Map<String, String> body) {

        String email = body.get("email");
        if (email == null) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(taskService.reassignVerifier(taskId, email));
    }

    @PostMapping("/{taskId}/proof")
    public ResponseEntity<Task> submitProof(@PathVariable Long taskId,
                                            @RequestBody ProofSubmissionRequest request) {
        return ResponseEntity.ok(taskService.submitProof(taskId, request));
    }

    @PostMapping("/{taskId}/review")
    public ResponseEntity<Task> reviewProof(@PathVariable Long taskId,
                                            @RequestBody @Valid ReviewTaskRequest request) {
        return ResponseEntity.ok(taskService.reviewProof(taskId, request));
    }

    @GetMapping("/{taskId}")
    public ResponseEntity<TaskDetailResponse> getTaskDetails(@PathVariable Long taskId) {
        return ResponseEntity.ok(taskService.getTaskDetails(taskId));
    }

    @PutMapping("/{taskId}/move")
    public ResponseEntity<Task> moveTaskToList(
            @PathVariable Long taskId,
            @RequestBody java.util.Map<String, Long> body) {
        Long listId = body.get("listId"); // null means move to default list
        return ResponseEntity.ok(taskService.moveTaskToList(taskId, listId));
    }

    @PutMapping("/{taskId}")
    public ResponseEntity<Task> updateTask(@PathVariable Long taskId,
                                           @RequestBody TaskUpdateRequest request) {
        return ResponseEntity.ok(taskService.updateTask(taskId, request));
    }
}