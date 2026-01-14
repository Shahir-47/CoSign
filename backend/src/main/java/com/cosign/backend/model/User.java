package com.cosign.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

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

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String timezone; // "America/New_York"

    private String profilePictureUrl; // Optional

    // Verification
    private boolean isEmailVerified = false;

    private String emailVerificationToken;
    private LocalDateTime emailVerificationTokenExpiry;

    @ManyToMany
    @JoinTable(
            name = "user_saved_verifiers",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "verifier_id")
    )
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Set<User> savedVerifiers = new HashSet<>();

    private LocalDateTime createdAt = LocalDateTime.now();
}