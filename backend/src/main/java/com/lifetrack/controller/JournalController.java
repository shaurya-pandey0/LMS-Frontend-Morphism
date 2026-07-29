package com.lifetrack.controller;

import com.lifetrack.dto.JournalDtos.JournalRequest;
import com.lifetrack.dto.JournalDtos.JournalResponse;
import com.lifetrack.security.SecurityUtils;
import com.lifetrack.service.JournalService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/journal")
public class JournalController {

    private final JournalService journalService;

    public JournalController(JournalService journalService) {
        this.journalService = journalService;
    }

    @GetMapping
    public List<JournalResponse> list() {
        return journalService.findAll(SecurityUtils.currentUserId()).stream()
                .map(JournalResponse::from)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public JournalResponse get(@PathVariable Long id) {
        return JournalResponse.from(journalService.findById(SecurityUtils.currentUserId(), id));
    }

    @PostMapping
    public ResponseEntity<JournalResponse> create(@Valid @RequestBody JournalRequest request) {
        JournalResponse body = JournalResponse.from(
                journalService.create(SecurityUtils.currentUserId(), request));
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    @PutMapping("/{id}")
    public JournalResponse update(@PathVariable Long id, @Valid @RequestBody JournalRequest request) {
        return JournalResponse.from(journalService.update(SecurityUtils.currentUserId(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        journalService.delete(SecurityUtils.currentUserId(), id);
        return ResponseEntity.noContent().build();
    }
}
