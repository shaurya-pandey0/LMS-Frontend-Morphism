package com.lifetrack.repository;

import com.lifetrack.entity.UserHabit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserHabitRepository extends JpaRepository<UserHabit, Long> {

    List<UserHabit> findByUserIdAndActiveTrueOrderByIdAsc(Long userId);

    List<UserHabit> findByUserIdOrderByIdAsc(Long userId);

    Optional<UserHabit> findByIdAndUserId(Long id, Long userId);

    long countByUserIdAndActiveTrue(Long userId);
}
