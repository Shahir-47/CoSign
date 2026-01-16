package com.cosign.backend.model;

import com.cosign.backend.converter.EncryptedStringConverter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "tasks")
@Data
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    @Convert(converter = EncryptedStringConverter.class)
    private String title;

    @Column(length = 1000)
    @Convert(converter = EncryptedStringConverter.class)
    private String description;

    @Column(nullable = false)
    private LocalDateTime deadline;

    // Customization
    @Convert(converter = EncryptedStringConverter.class)
    private String location;

    private boolean isStarred = false;
    private String repeatPattern; // "DAILY", "WEEKLY"

    @Enumerated(EnumType.STRING)
    private TaskPriority priority = TaskPriority.MEDIUM;

    @Enumerated(EnumType.STRING)
    private TaskStatus status = TaskStatus.PENDING_PROOF;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id", nullable = false)
    @JsonIgnoreProperties({"savedVerifiers", "passwordHash", "emailVerificationToken", "emailVerificationTokenExpiry"})
    private User creator;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verifier_id", nullable = false)
    @JsonIgnoreProperties({"savedVerifiers", "passwordHash", "emailVerificationToken", "emailVerificationTokenExpiry"})
    private User verifier;

    @Column(length = 500)
    @Convert(converter = EncryptedStringConverter.class)
    private String tags;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "list_id")
    @JsonIgnoreProperties({"tasks", "user"})
    private TaskList list;

    // Proof Data
    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptedStringConverter.class)
    private String proofDescription;

    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<ProofAttachment> proofAttachments = new java.util.ArrayList<>();

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptedStringConverter.class)
    private String denialReason;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptedStringConverter.class)
    private String approvalComment;

    @OneToOne(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JoinColumn(name = "penalty_id", referencedColumnName = "id")
    @JsonIgnoreProperties({"task", "user"})
    private Penalty penalty;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime submittedAt;

    private LocalDateTime verifiedAt;

    private LocalDateTime completedAt;

    private LocalDateTime updatedAt;

    private LocalDateTime rejectedAt;

    // Penalty tracking - prevents duplicate penalty emails
    private boolean penaltyEmailSent = false;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}