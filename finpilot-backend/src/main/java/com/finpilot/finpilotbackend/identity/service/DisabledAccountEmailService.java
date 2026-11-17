package com.finpilot.finpilotbackend.identity.service;

import org.slf4j.Logger; import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnMissingBean(AccountEmailService.class)
public class DisabledAccountEmailService implements AccountEmailService {
    private static final Logger log = LoggerFactory.getLogger(DisabledAccountEmailService.class);
    public void sendPasswordReset(String recipient, String resetUrl) { log.warn("Password reset email suppressed because app.email.enabled is false"); }
    public void sendEmailVerification(String recipient, String verificationUrl) { log.warn("Verification email suppressed because app.email.enabled is false"); }
}
