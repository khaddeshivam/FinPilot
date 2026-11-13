package com.finpilot.finpilotbackend.identity.service;

public interface AccountEmailService {
    void sendPasswordReset(String recipient, String resetUrl);
    void sendEmailVerification(String recipient, String verificationUrl);
}
