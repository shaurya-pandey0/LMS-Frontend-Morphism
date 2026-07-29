package com.lifetrack.controller;

import com.lifetrack.config.ReferenceProperties;
import com.lifetrack.dto.ReferenceDtos.ReferenceResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Domain vocabulary (expense categories, habit catalog, moods). Public and
 * authenticated the same as everything else — there's nothing sensitive here,
 * but it's still behind the JWT filter for consistency with the rest of the API.
 */
@RestController
@RequestMapping("/api/reference")
public class ReferenceController {

    private final ReferenceProperties referenceProperties;

    public ReferenceController(ReferenceProperties referenceProperties) {
        this.referenceProperties = referenceProperties;
    }

    @GetMapping
    public ReferenceResponse reference() {
        return ReferenceResponse.from(referenceProperties);
    }
}
