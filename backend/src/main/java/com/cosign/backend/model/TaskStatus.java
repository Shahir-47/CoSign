package com.cosign.backend.model;

public enum TaskStatus {
    PENDING_PROOF,        // Task created, waiting for user to do it
    PENDING_VERIFICATION, // User uploaded proof, waiting for Verifier
    COMPLETED,            // Verifier signed off
    MISSED                // Deadline passed without verification
}