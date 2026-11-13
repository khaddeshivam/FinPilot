package com.finpilot.finpilotbackend.identity.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "app.email.enabled", havingValue = "true")
public class SmtpAccountEmailService implements AccountEmailService {
    private final JavaMailSender sender; private final String from;
    public SmtpAccountEmailService(JavaMailSender sender, @Value("${app.email.from}") String from) { this.sender = sender; this.from = from; }
    public void sendPasswordReset(String recipient, String url) { send(recipient, "Reset your FinPilot password", "Reset your password", "Use the secure link below to choose a new FinPilot password.", url, "Reset password"); }
    public void sendEmailVerification(String recipient, String url) { send(recipient, "Verify your FinPilot email", "Verify your email", "Confirm this email address to keep your FinPilot account up to date.", url, "Verify email"); }
    private void send(String to, String subject, String title, String copy, String url, String cta) {
        try { MimeMessage message = sender.createMimeMessage(); MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8"); helper.setTo(to); helper.setFrom(from); helper.setSubject(subject); helper.setText("<main style='font-family:Arial,sans-serif;color:#10281e'><h1>" + title + "</h1><p>" + copy + "</p><p><a href='" + url + "' style='display:inline-block;padding:12px 20px;border-radius:24px;background:#80e34c;color:#10281e;text-decoration:none;font-weight:600'>" + cta + "</a></p><p>This link expires soon. If you did not request this, you can ignore this email.</p></main>", true); sender.send(message); }
        catch (Exception ex) { throw new IllegalStateException("Could not send account email", ex); }
    }
}
