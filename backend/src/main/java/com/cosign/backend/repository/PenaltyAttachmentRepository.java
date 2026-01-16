package com.cosign.backend.repository;

import com.cosign.backend.model.PenaltyAttachment;
import com.cosign.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PenaltyAttachmentRepository extends JpaRepository<PenaltyAttachment, Long> {

    /**
     * Check if any attachment with the given content hash exists for this user
     * where the penalty has been exposed (task failed)
     */
    @Query("SELECT CASE WHEN COUNT(pa) > 0 THEN true ELSE false END " +
           "FROM PenaltyAttachment pa " +
           "WHERE pa.penalty.user = :user " +
           "AND pa.contentHash IN :hashes " +
           "AND pa.penalty.isExposed = true")
    boolean existsByUserAndContentHashInAndPenaltyExposed(
            @Param("user") User user,
            @Param("hashes") List<String> hashes);
}
