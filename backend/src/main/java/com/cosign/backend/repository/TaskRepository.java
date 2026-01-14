package com.cosign.backend.repository;

import com.cosign.backend.model.Task;
import com.cosign.backend.model.TaskList;
import com.cosign.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByCreator(User creator);
    List<Task> findByVerifier(User verifier);
    List<Task> findByCreatorAndList(User creator, TaskList list);
    
    int countByListAndCreator(TaskList list, User creator);
    
    @Modifying
    @Query("UPDATE Task t SET t.list = :newList WHERE t.list = :oldList")
    void moveTasksToList(@Param("oldList") TaskList oldList, @Param("newList") TaskList newList);
}