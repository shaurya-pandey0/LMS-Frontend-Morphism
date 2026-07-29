package com.lifetrack.repository;

import com.lifetrack.entity.DailyHabitCompletion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyHabitCompletionRepository extends JpaRepository<DailyHabitCompletion, Long> {

    Optional<DailyHabitCompletion> findByUserIdAndHabitIdAndDate(Long userId, Long habitId, LocalDate date);

    List<DailyHabitCompletion> findByUserIdAndDate(Long userId, LocalDate date);

    List<DailyHabitCompletion> findByUserIdAndDateBetween(Long userId, LocalDate start, LocalDate end);
}
