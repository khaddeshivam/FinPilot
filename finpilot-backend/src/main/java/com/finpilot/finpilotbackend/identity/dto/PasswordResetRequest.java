package com.finpilot.finpilotbackend.identity.dto;
import jakarta.validation.constraints.Email; import jakarta.validation.constraints.NotBlank;
public class PasswordResetRequest { @NotBlank @Email private String email; public String getEmail(){return email;} public void setEmail(String email){this.email=email;} }
