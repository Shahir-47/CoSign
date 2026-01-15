package com.cosign.backend.controller;

import com.cosign.backend.model.User;
import com.cosign.backend.repository.UserRepository;
import com.cosign.backend.service.S3Service;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {

    private final S3Service s3Service;
    private final UserRepository userRepository;

    public UploadController(S3Service s3Service, UserRepository userRepository) {
        this.s3Service = s3Service;
        this.userRepository = userRepository;
    }

    @PostMapping("/presign")
    public ResponseEntity<?> getPresignedUrl(@RequestBody Map<String, String> body) {
        // Get the email from the SecurityContext
        String email = Objects.requireNonNull(SecurityContextHolder.getContext().getAuthentication()).getName();

        // Look up the User ID
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String filename = body.get("name");
        String type = body.get("type");

        //  Use the real ID
        String key = "proofs/" + user.getId() + "/" + UUID.randomUUID() + "_" + filename;

        String url = s3Service.generatePresignedUploadUrl(key, type);

        return ResponseEntity.ok(Map.of(
                "url", url,
                "key", key
        ));
    }
}