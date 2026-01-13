package com.cosign.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false, unique = true)
    private String phoneNumber;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String timezone; // "America/New_York"

    private String profilePictureUrl; // Optional

    // Verification
    private boolean isEmailVerified = false;
    private boolean isPhoneVerified = false;

    private String emailVerificationToken;
    private String phoneVerificationCode;

    private LocalDateTime createdAt = LocalDateTime.now();
}