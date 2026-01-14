package com.cosign.backend.repository;

import com.cosign.backend.model.TaskList;
import com.cosign.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TaskListRepository extends JpaRepository<TaskList, Long> {
    List<TaskList> findByUserOrderByCreatedAtAsc(User user);
    Optional<TaskList> findByIdAndUser(Long id, User user);
    Optional<TaskList> findByUserAndIsDefaultTrue(User user);
    boolean existsByNameAndUser(String name, User user);
}
