package com.cosign.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
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
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private LocalDateTime deadline;

    // Customization
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
    private String tags;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "list_id")
    @JsonIgnoreProperties({"tasks", "user"})
    private TaskList list;

    // Proof Data
    @Column(columnDefinition = "TEXT")
    private String proofDescription;

    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<ProofAttachment> proofAttachments = new java.util.ArrayList<>();

    @Column(columnDefinition = "TEXT")
    private String denialReason;

    @Column(columnDefinition = "TEXT")
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