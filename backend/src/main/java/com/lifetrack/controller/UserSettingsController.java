package com.lifetrack.controller;

import com.lifetrack.dto.UserSettingsDtos.UserSettingsRequest;
import com.lifetrack.dto.UserSettingsDtos.UserSettingsResponse;
import com.lifetrack.security.SecurityUtils;
import com.lifetrack.service.UserSettingsService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings")
public class UserSettingsController {

    private final UserSettingsService userSettingsService;

    public UserSettingsController(UserSettingsService userSettingsService) {
        this.userSettingsService = userSettingsService;
    }

    @GetMapping
    public UserSettingsResponse get() {
        return UserSettingsResponse.from(userSettingsService.getOrCreate(SecurityUtils.currentUserId()));
    }

    @PutMapping
    public UserSettingsResponse update(@Valid @RequestBody UserSettingsRequest request) {
        return UserSettingsResponse.from(userSettingsService.update(SecurityUtils.currentUserId(), request));
    }
}
