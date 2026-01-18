package com.cosign.backend.controller;

import com.cosign.backend.service.TaskService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cron")
public class CronController {

    private final TaskService taskService;

    public CronController(TaskService taskService) {
        this.taskService = taskService;
    }

    /**
     * This endpoint will be hit by Cron Job.
     */
    @GetMapping("/process-missed")
    public String triggerDeadlineCheck() {
        taskService.processMissedTasks();
        return "Deadline check executed successfully";
    }
}