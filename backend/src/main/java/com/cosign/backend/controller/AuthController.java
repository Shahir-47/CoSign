package com.cosign.backend.controller;

import com.cosign.backend.dto.SignupRequest;
import com.cosign.backend.service.AuthService;
import com.cosign.backend.service.S3Service;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.cosign.backend.dto.LoginRequest;
import com.cosign.backend.dto.LoginResponse;
import com.cosign.backend.dto.ForgotPasswordRequest;
import com.cosign.backend.dto.ResetPasswordRequest;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final S3Service s3Service;

    public AuthController(AuthService authService, S3Service s3Service) {
        this.authService = authService;
        this.s3Service = s3Service;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest request) {
        authService.signup(request);
        return ResponseEntity.ok("User registered successfully. Please check your email to verify.");
    }

    @GetMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestParam String token) {
        authService.verifyEmail(token);
        return ResponseEntity.ok("Email verified successfully!");
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest().body("Email is required");
        }

        authService.resendVerificationEmail(email);
        return ResponseEntity.ok("Verification email sent.");
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok("If an account exists with that email, we have sent a password reset link.");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok("Password has been reset successfully. You can now login.");
    }

    @PostMapping("/signup-avatar-presign")
    public ResponseEntity<?> getSignupAvatarPresignedUrl(@RequestBody Map<String, String> body) {
        String filename = body.get("name");
        String type = body.get("type");

        if (filename == null || type == null) {
            return ResponseEntity.badRequest().body("Missing name or type");
        }

        // Only allow image types
        if (!type.startsWith("image/")) {
            return ResponseEntity.badRequest().body("Only image files are allowed");
        }

        // Structure: avatars/pending/{uuid}_{filename}
        // These will be moved to the user's folder after signup
        String key = "avatars/pending/" + UUID.randomUUID() + "_" + filename;

        String url = s3Service.generatePresignedUploadUrl(key, type);

        return ResponseEntity.ok(Map.of(
                "url", url,
                "key", key
        ));
    }
}
