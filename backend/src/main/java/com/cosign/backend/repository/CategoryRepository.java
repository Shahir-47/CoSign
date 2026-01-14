package com.cosign.backend.repository;

import com.cosign.backend.model.Category;
import com.cosign.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByUser(User user);
    Optional<Category> findByNameAndUser(String name, User user);
}