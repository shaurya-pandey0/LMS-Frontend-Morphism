package com.lifetrack.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** API contracts for registration, login, and successful authentication. */
public class AuthDtos {

    /** Validated data required to create a user account. */
    public record RegisterRequest(
            @NotBlank String fullName,
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8, message = "Password must be at least 8 characters") String password
    ) {}

    /** Credentials accepted by the login endpoint. */
    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password
    ) {}

    /** JWT and safe account details returned after authentication. */
    public record AuthResponse(
            String token,
            String tokenType,
            UserDto user
    ) {}
}
