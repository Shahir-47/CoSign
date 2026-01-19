package com.cosign.backend.repository;

import com.cosign.backend.model.Task;
import com.cosign.backend.model.TaskList;
import com.cosign.backend.model.TaskStatus;
import com.cosign.backend.model.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long> {
    // Use JOIN FETCH to eagerly load creator, verifier, and list to prevent LazyInitializationException
    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.creator LEFT JOIN FETCH t.verifier LEFT JOIN FETCH t.list WHERE t.creator = :creator")
    List<Task> findByCreator(@Param("creator") User creator);

    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.creator LEFT JOIN FETCH t.verifier LEFT JOIN FETCH t.list WHERE t.verifier = :verifier")
    List<Task> findByVerifier(@Param("verifier") User verifier);

    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.creator LEFT JOIN FETCH t.verifier LEFT JOIN FETCH t.list WHERE t.creator = :creator AND t.list = :list")
    List<Task> findByCreatorAndList(@Param("creator") User creator, @Param("list") TaskList list);

    // Find by ID with pessimistic write lock to prevent race conditions
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM Task t WHERE t.id = :id")
    Optional<Task> findByIdWithLock(@Param("id") Long id);

    int countByListAndCreator(TaskList list, User creator);

    @Modifying
    @Query("UPDATE Task t SET t.list = :newList WHERE t.list = :oldList")
    void moveTasksToList(@Param("oldList") TaskList oldList, @Param("newList") TaskList newList);

    @Query("SELECT t FROM Task t WHERE t.creator = :creator AND t.verifier = :verifier " +
            "AND t.status IN ('PENDING_PROOF', 'PENDING_VERIFICATION') " +
            "AND t.deadline > :now")
    List<Task> findActiveTasksForVerifier(
            @Param("creator") User creator,
            @Param("verifier") User verifier,
            @Param("now") LocalDateTime now
    );

    // Count tasks by verifier and creator with specific status
    @Query("SELECT COUNT(t) FROM Task t WHERE t.verifier = :verifier AND t.creator = :creator AND t.status = :status")
    int countByVerifierAndCreatorAndStatus(
            @Param("verifier") User verifier,
            @Param("creator") User creator,
            @Param("status") TaskStatus status
    );

    // Find tasks by status (for timezone-aware overdue checking)
    List<Task> findByStatusIn(List<TaskStatus> statuses);

    // Count all tasks by verifier and creator
    int countByVerifierAndCreator(User verifier, User creator);
}