package com.cosign.backend.controller;

import com.cosign.backend.dto.TaskListRequest;
import com.cosign.backend.dto.TaskListResponse;
import com.cosign.backend.service.TaskListService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lists")
public class TaskListController {

    private final TaskListService taskListService;

    public TaskListController(TaskListService taskListService) {
        this.taskListService = taskListService;
    }

    @GetMapping
    public ResponseEntity<List<TaskListResponse>> getMyLists() {
        return ResponseEntity.ok(taskListService.getMyLists());
    }

    @PostMapping
    public ResponseEntity<TaskListResponse> createList(@Valid @RequestBody TaskListRequest request) {
        return ResponseEntity.ok(taskListService.createList(request));
    }

    @PutMapping("/{listId}")
    public ResponseEntity<TaskListResponse> updateList(
            @PathVariable Long listId,
            @Valid @RequestBody TaskListRequest request) {
        return ResponseEntity.ok(taskListService.updateList(listId, request));
    }

    @DeleteMapping("/{listId}")
    public ResponseEntity<Void> deleteList(@PathVariable Long listId) {
        taskListService.deleteList(listId);
        return ResponseEntity.ok().build();
    }
}
