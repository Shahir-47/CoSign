package com.cosign.backend.controller;

import com.cosign.backend.dto.LoginResponse;
import com.cosign.backend.dto.UpdateProfileRequest;
import com.cosign.backend.model.User;
import com.cosign.backend.service.S3Service;
import com.cosign.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserService userService;
    private final S3Service s3Service;

    public UserController(UserService userService, S3Service s3Service) {
        this.userService = userService;
        this.s3Service = s3Service;
    }

    @GetMapping("/profile")
    public ResponseEntity<LoginResponse> getProfile() {
        User user = userService.getProfile();
        String pfpUrl = user.getProfilePictureUrl() != null
                ? s3Service.generatePresignedDownloadUrl(user.getProfilePictureUrl())
                : null;

        return ResponseEntity.ok(new LoginResponse(
                null,
                user.getEmail(),
                user.getFullName(),
                user.getTimezone(),
                pfpUrl
        ));
    }

    @PutMapping("/profile")
    public ResponseEntity<LoginResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        User user = userService.updateProfile(request);

        String pfpUrl = user.getProfilePictureUrl() != null
                ? s3Service.generatePresignedDownloadUrl(user.getProfilePictureUrl())
                : null;

        return ResponseEntity.ok(new LoginResponse(
                null,
                user.getEmail(),
                user.getFullName(),
                user.getTimezone(),
                pfpUrl
        ));
    }
}