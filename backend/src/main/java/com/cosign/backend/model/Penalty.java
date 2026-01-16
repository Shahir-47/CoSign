package com.cosign.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "penalties")
@Data
public class Penalty {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String encryptedContent;

    @Column(nullable = false)
    private String contentHash; // To check reuse validity

    @Column(nullable = false)
    private boolean isExposed = false; // True if task failed and verifier saw it

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // One-to-One: penalty belongs to one specific task instance
    @OneToOne(mappedBy = "penalty")
    private Task task;

    @OneToMany(mappedBy = "penalty", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PenaltyAttachment> attachments = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}