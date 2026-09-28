package com.finpilot.finpilotbackend.identity.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.nio.charset.StandardCharsets;

public class RegisterRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    @Size(max = 255, message = "Email must be at most 255 characters")
    private String email;

    @NotBlank(message = "Password is required")
    // BCrypt only uses the first 72 bytes of the password; silently truncating
    // longer passwords can create security surprises. Rejecting them at the
    // validation layer makes the constraint explicit rather than hidden.
    // @Size counts Java chars (UTF-16 code units), not bytes. A supplementary-
    // plane character is 1 char but up to 4 UTF-8 bytes, so the byte check below
    // is also required to catch passwords that pass the char limit but exceed 72 bytes.
    @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
    private String password;

    // Cross-field constraint: verify the UTF-8 byte length stays within BCrypt's
    // hard 72-byte input limit. @JsonIgnore keeps this helper off the response DTO.
    @JsonIgnore
    @AssertTrue(message = "Password must be at most 72 bytes when UTF-8 encoded")
    public boolean isPasswordWithinBcryptLimit() {
        return password == null || password.getBytes(StandardCharsets.UTF_8).length <= 72;
    }

    @NotBlank(message = "Full name is required")
    @Size(max = 255, message = "Full name must be at most 255 characters")
    private String fullName;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }
}
