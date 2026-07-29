package com.lifetrack.dto;

import com.lifetrack.entity.JournalEntry;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

/** Request and response contracts for journal reflections. */
public class JournalDtos {

    /** User-authored journal data accepted by create and update operations. */
    public record JournalRequest(
            LocalDate date,
            @NotBlank String mood,
            @NotBlank String text
    ) {}

    /** Persisted journal entry returned without internal ownership metadata. */
    public record JournalResponse(
            Long id,
            LocalDate date,
            String mood,
            String text
    ) {
        public static JournalResponse from(JournalEntry entry) {
            return new JournalResponse(
                    entry.getId(),
                    entry.getDate(),
                    entry.getMood(),
                    entry.getText()
            );
        }
    }
}
