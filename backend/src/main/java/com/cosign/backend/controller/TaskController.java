package com.cosign.backend.controller;

import com.cosign.backend.dto.TaskRequest;
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
}