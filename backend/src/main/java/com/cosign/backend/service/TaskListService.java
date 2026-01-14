package com.cosign.backend.service;

import com.cosign.backend.dto.TaskListRequest;
import com.cosign.backend.dto.TaskListResponse;
import com.cosign.backend.model.TaskList;
import com.cosign.backend.model.User;
import com.cosign.backend.repository.TaskListRepository;
import com.cosign.backend.repository.TaskRepository;
import com.cosign.backend.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class TaskListService {

    private final TaskListRepository taskListRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public TaskListService(TaskListRepository taskListRepository,
                           TaskRepository taskRepository,
                           UserRepository userRepository) {
        this.taskListRepository = taskListRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public List<TaskListResponse> getMyLists() {
        User user = getCurrentUser();
        List<TaskList> lists = taskListRepository.findByUserOrderByCreatedAtAsc(user);
        
        // Create default list if none exist
        if (lists.isEmpty()) {
            TaskList defaultList = getOrCreateDefaultList(user);
            lists = List.of(defaultList);
        }
        
        return lists.stream().map(list -> {
            int taskCount = taskRepository.countByListAndCreator(list, user);
            return new TaskListResponse(
                list.getId(),
                list.getName(),
                list.getColorHex(),
                list.getIcon(),
                list.isDefault(),
                taskCount
            );
        }).collect(Collectors.toList());
    }

    @Transactional
    public TaskListResponse createList(TaskListRequest request) {
        User user = getCurrentUser();

        if (taskListRepository.existsByNameAndUser(request.getName(), user)) {
            throw new RuntimeException("A list with this name already exists");
        }

        TaskList list = new TaskList();
        list.setName(request.getName());
        list.setColorHex(request.getColorHex());
        list.setIcon(request.getIcon());
        list.setUser(user);
        list.setDefault(false);

        taskListRepository.save(list);

        return new TaskListResponse(
            list.getId(),
            list.getName(),
            list.getColorHex(),
            list.getIcon(),
            list.isDefault(),
            0
        );
    }

    @Transactional
    public TaskListResponse updateList(Long listId, TaskListRequest request) {
        User user = getCurrentUser();
        
        TaskList list = taskListRepository.findByIdAndUser(listId, user)
                .orElseThrow(() -> new RuntimeException("List not found"));

        // Check if name is taken by another list
        if (!list.getName().equals(request.getName()) && 
            taskListRepository.existsByNameAndUser(request.getName(), user)) {
            throw new RuntimeException("A list with this name already exists");
        }

        list.setName(request.getName());
        list.setColorHex(request.getColorHex());
        list.setIcon(request.getIcon());

        taskListRepository.save(list);

        int taskCount = taskRepository.countByListAndCreator(list, user);
        return new TaskListResponse(
            list.getId(),
            list.getName(),
            list.getColorHex(),
            list.getIcon(),
            list.isDefault(),
            taskCount
        );
    }

    @Transactional
    public void deleteList(Long listId) {
        User user = getCurrentUser();
        
        TaskList list = taskListRepository.findByIdAndUser(listId, user)
                .orElseThrow(() -> new RuntimeException("List not found"));

        if (list.isDefault()) {
            throw new RuntimeException("Cannot delete the default list");
        }

        // Move tasks to default list
        TaskList defaultList = getOrCreateDefaultList(user);
        taskRepository.moveTasksToList(list, defaultList);

        taskListRepository.delete(list);
    }

    @Transactional
    public TaskList getOrCreateDefaultList(User user) {
        return taskListRepository.findByUserAndIsDefaultTrue(user)
                .orElseGet(() -> {
                    TaskList defaultList = new TaskList();
                    defaultList.setName("My Tasks");
                    defaultList.setColorHex("#6366f1");
                    defaultList.setIcon("inbox");
                    defaultList.setUser(user);
                    defaultList.setDefault(true);
                    return taskListRepository.save(defaultList);
                });
    }
}
