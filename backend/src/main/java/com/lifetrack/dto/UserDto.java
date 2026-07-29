package com.lifetrack.dto;

import com.lifetrack.entity.User;

/** Public account representation that deliberately excludes the password hash. */
public record UserDto(
        Long id,
        String fullName,
        String email,
        String role
) {
    public static UserDto from(User user) {
        return new UserDto(user.getId(), user.getFullName(), user.getEmail(), user.getRole().name());
    }
}
