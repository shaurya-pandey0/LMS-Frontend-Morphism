package com.lifetrack.repository;

import com.lifetrack.entity.DailyLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyLogRepository extends JpaRepository<DailyLog, Long> {

    List<DailyLog> findByUserIdOrderByDateDesc(Long userId);

    Optional<DailyLog> findByUserIdAndDate(Long userId, LocalDate date);

    Optional<DailyLog> findByIdAndUserId(Long id, Long userId);

    List<DailyLog> findByUserIdAndDateBetweenOrderByDateAsc(Long userId, LocalDate start, LocalDate end);
}
