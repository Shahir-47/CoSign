package com.cosign.backend.repository;

import com.cosign.backend.model.Penalty;
import com.cosign.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PenaltyRepository extends JpaRepository<Penalty, Long> {
    // Check if this User has ever used this Content AND it was Exposed
    boolean existsByUserAndContentHashAndIsExposedTrue(User user, String contentHash);
}