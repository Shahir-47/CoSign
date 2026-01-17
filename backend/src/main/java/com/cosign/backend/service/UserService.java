package com.cosign.backend.service;

import com.cosign.backend.dto.UpdateProfileRequest;
import com.cosign.backend.model.User;
import com.cosign.backend.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        String email = Objects.requireNonNull(SecurityContextHolder.getContext().getAuthentication()).getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Transactional
    public User updateProfile(UpdateProfileRequest request) {
        User user = getCurrentUser();

        user.setFullName(request.getFullName());
        user.setTimezone(request.getTimezone());

        // Only update PFP if a new key is provided
        if (request.getProfilePictureKey() != null && !request.getProfilePictureKey().isEmpty()) {
            user.setProfilePictureUrl(request.getProfilePictureKey());
        }

        return userRepository.save(user);
    }

    public User getProfile() {
        return getCurrentUser();
    }
}