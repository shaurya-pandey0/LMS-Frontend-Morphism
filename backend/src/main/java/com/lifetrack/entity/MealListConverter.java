package com.lifetrack.entity;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.List;

/**
 * Persists a daily log's meals as a JSON string.
 *
 * <p>JPA cannot nest an {@code @ElementCollection} inside an {@code @Embeddable},
 * and {@link DailyLog.Meal} holds its own list of items. Storing the list as
 * JSON keeps the API/DTO shape unchanged and avoids a two-level join table.
 */
@Converter
public class MealListConverter implements AttributeConverter<List<DailyLog.Meal>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<List<DailyLog.Meal>> TYPE = new TypeReference<>() {
    };

    @Override
    public String convertToDatabaseColumn(List<DailyLog.Meal> meals) {
        try {
            return MAPPER.writeValueAsString(meals == null ? new ArrayList<>() : meals);
        } catch (Exception e) {
            throw new IllegalStateException("Could not serialise meals", e);
        }
    }

    @Override
    public List<DailyLog.Meal> convertToEntityAttribute(String json) {
        if (json == null || json.isBlank()) {
            return new ArrayList<>();
        }
        try {
            return MAPPER.readValue(json, TYPE);
        } catch (Exception e) {
            throw new IllegalStateException("Could not deserialise meals", e);
        }
    }
}
