package com.lifetrack.repository;

import com.lifetrack.entity.JournalEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface JournalEntryRepository extends JpaRepository<JournalEntry, Long> {

    List<JournalEntry> findByUserIdOrderByDateDesc(Long userId);

    Optional<JournalEntry> findByIdAndUserId(Long id, Long userId);

    List<JournalEntry> findByUserIdAndDateBetween(Long userId, LocalDate start, LocalDate end);
}
