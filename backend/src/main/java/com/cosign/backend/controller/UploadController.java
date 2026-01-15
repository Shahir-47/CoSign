package com.cosign.backend.controller;

import com.cosign.backend.service.S3Service;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {

    private final S3Service s3Service;

    public UploadController(S3Service s3Service) {
        this.s3Service = s3Service;
    }

    @PostMapping("/presign")
    public ResponseEntity<?> getPresignedUrl(@RequestBody Map<String, String> body,
                                             jakarta.servlet.http.HttpServletRequest request) {
        String filename = body.get("name");
        String type = body.get("type");
        Long userId = (Long) request.getAttribute("userId"); // Assumes AuthMiddleware sets this

        // Organize bucket by userId to prevent name collisions
        String key = "proofs/" + userId + "/" + UUID.randomUUID() + "_" + filename;

        String url = s3Service.generatePresignedUploadUrl(key, type);

        return ResponseEntity.ok(Map.of(
                "url", url,
                "key", key
        ));
    }
}