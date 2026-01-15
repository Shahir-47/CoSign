package com.cosign.backend.repository;

import com.cosign.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<User> findByEmailVerificationToken(String token);

    // Find users who have saved a specific verifier to notify them when verifier is online
    @Query("SELECT u FROM User u JOIN u.savedVerifiers v WHERE v.id = :verifierId")
    List<User> findUsersBySavedVerifier(@Param("verifierId") Long verifierId);
}