package com.cosign.backend.model;

import com.cosign.backend.converter.EncryptedStringConverter;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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

    // Renamed from encryptedContent to content, now handled by converter
    @Column(nullable = false, columnDefinition = "TEXT")
    @Convert(converter = EncryptedStringConverter.class)
    private String content;

    @Column(nullable = false)
    private String contentHash; // To check reuse validity

    @Column(nullable = false)
    private boolean isExposed = false; // True if task failed and verifier saw it

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    // One-to-One: penalty belongs to one specific task instance
    @OneToOne(mappedBy = "penalty")
    @JsonIgnore
    private Task task;

    @OneToMany(mappedBy = "penalty", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties({"penalty"})
    private List<PenaltyAttachment> attachments = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}