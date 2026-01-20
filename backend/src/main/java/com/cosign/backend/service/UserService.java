package com.cosign.backend.service;

import com.cosign.backend.dto.UpdateProfileRequest;
import com.cosign.backend.model.Task;
import com.cosign.backend.model.User;
import com.cosign.backend.repository.TaskRepository;
import com.cosign.backend.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Objects;
import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;

    public UserService(UserRepository userRepository, TaskRepository taskRepository) {
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
    }

    private User getCurrentUser() {
        String email = Objects.requireNonNull(SecurityContextHolder.getContext().getAuthentication()).getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Transactional
    public User updateProfile(UpdateProfileRequest request) {
        User user = getCurrentUser();
        String previousTimezone = user.getTimezone();
        String nextTimezone = request.getTimezone();

        if (previousTimezone != null && !previousTimezone.equals(nextTimezone)) {
            shiftTaskTimes(user, previousTimezone, nextTimezone);
        }

        user.setFullName(request.getFullName());
        user.setTimezone(nextTimezone);

        // Only update PFP if a new key is provided
        if (request.getProfilePictureKey() != null && !request.getProfilePictureKey().isEmpty()) {
            user.setProfilePictureUrl(request.getProfilePictureKey());
        }

        return userRepository.save(user);
    }

    public User getProfile() {
        return getCurrentUser();
    }

    private void shiftTaskTimes(User creator, String fromTimezone, String toTimezone) {
        ZoneId fromZone = ZoneId.of(fromTimezone);
        ZoneId toZone = ZoneId.of(toTimezone);
        List<Task> tasks = taskRepository.findByCreator(creator);

        for (Task task : tasks) {
            task.setDeadline(shiftLocalDateTime(task.getDeadline(), fromZone, toZone));
            task.setCreatedAt(shiftLocalDateTime(task.getCreatedAt(), fromZone, toZone));
            task.setSubmittedAt(shiftLocalDateTime(task.getSubmittedAt(), fromZone, toZone));
            task.setVerifiedAt(shiftLocalDateTime(task.getVerifiedAt(), fromZone, toZone));
            task.setCompletedAt(shiftLocalDateTime(task.getCompletedAt(), fromZone, toZone));
            task.setRejectedAt(shiftLocalDateTime(task.getRejectedAt(), fromZone, toZone));
        }

        taskRepository.saveAll(tasks);
    }

    private LocalDateTime shiftLocalDateTime(
            LocalDateTime value,
            ZoneId fromZone,
            ZoneId toZone
    ) {
        if (value == null) {
            return null;
        }
        return value.atZone(fromZone).withZoneSameInstant(toZone).toLocalDateTime();
    }
}
