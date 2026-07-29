package com.lifetrack.service;

import com.lifetrack.config.ReferenceProperties;
import com.lifetrack.dto.JournalDtos.JournalRequest;
import com.lifetrack.entity.JournalEntry;
import com.lifetrack.exception.BadRequestException;
import com.lifetrack.exception.ResourceNotFoundException;
import com.lifetrack.repository.JournalEntryRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
public class JournalService {

    private final JournalEntryRepository journalEntryRepository;
    private final ReferenceProperties referenceProperties;

    public JournalService(JournalEntryRepository journalEntryRepository, ReferenceProperties referenceProperties) {
        this.journalEntryRepository = journalEntryRepository;
        this.referenceProperties = referenceProperties;
    }

    public List<JournalEntry> findAll(Long userId) {
        return journalEntryRepository.findByUserIdOrderByDateDesc(userId);
    }

    public JournalEntry findById(Long userId, Long id) {
        return journalEntryRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Journal entry not found: " + id));
    }

    public JournalEntry create(Long userId, JournalRequest request) {
        JournalEntry entry = new JournalEntry();
        entry.setUserId(userId);
        apply(entry, request);
        entry.setCreatedAt(Instant.now());
        entry.setUpdatedAt(Instant.now());
        return journalEntryRepository.save(entry);
    }

    public JournalEntry update(Long userId, Long id, JournalRequest request) {
        JournalEntry entry = findById(userId, id);
        apply(entry, request);
        entry.setUpdatedAt(Instant.now());
        return journalEntryRepository.save(entry);
    }

    public void delete(Long userId, Long id) {
        JournalEntry entry = findById(userId, id);
        journalEntryRepository.delete(entry);
    }

    private void apply(JournalEntry entry, JournalRequest request) {
        if (!referenceProperties.isValidJournalMood(request.mood())) {
            throw new BadRequestException(
                    "Unknown journal mood: " + request.mood()
                            + ". Valid moods: " + referenceProperties.getJournalMoods());
        }
        entry.setDate(request.date() != null ? request.date() : LocalDate.now());
        entry.setMood(request.mood());
        entry.setText(request.text());
    }
}
