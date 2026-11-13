package com.finpilot.finpilotbackend.identity.service;

import com.finpilot.finpilotbackend.identity.entity.*;
import com.finpilot.finpilotbackend.identity.repository.AccountActionTokenRepository;
import com.finpilot.finpilotbackend.identity.repository.RefreshTokenRepository;
import com.finpilot.finpilotbackend.identity.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets; import java.security.MessageDigest; import java.security.SecureRandom; import java.time.LocalDateTime; import java.util.Base64; import java.util.Locale;

@Service
public class AccountActionService {
    private final AccountActionTokenRepository tokens; private final UserRepository users; private final RefreshTokenRepository refreshTokens; private final PasswordEncoder passwordEncoder; private final AccountEmailService email; private final String frontendBaseUrl; private final SecureRandom random = new SecureRandom();
    public AccountActionService(AccountActionTokenRepository tokens, UserRepository users, RefreshTokenRepository refreshTokens, PasswordEncoder passwordEncoder, AccountEmailService email, @Value("${app.frontend.base-url}") String frontendBaseUrl) { this.tokens=tokens; this.users=users; this.refreshTokens=refreshTokens; this.passwordEncoder=passwordEncoder; this.email=email; this.frontendBaseUrl=frontendBaseUrl.replaceAll("/$", ""); }
    @Transactional public void requestPasswordReset(String input) { users.findByEmail(normalize(input)).ifPresent(user -> { String raw=issue(user, AccountActionType.PASSWORD_RESET, 30); email.sendPasswordReset(user.getEmail(), frontendBaseUrl + "/reset-password?token=" + raw); }); }
    @Transactional public void resetPassword(String raw, String password) { AccountActionToken token=usable(raw,AccountActionType.PASSWORD_RESET); User user=token.getUser(); user.setPasswordHash(passwordEncoder.encode(password)); token.markUsed(); tokens.invalidateActiveForUser(user.getId(),AccountActionType.PASSWORD_RESET); refreshTokens.revokeAllForUser(user.getId()); }
    @Transactional public void sendVerification(User user) { if (user.isEmailVerified()) return; String raw=issue(user,AccountActionType.EMAIL_VERIFICATION,60); email.sendEmailVerification(user.getEmail(),frontendBaseUrl + "/verify-email?token=" + raw); }
    @Transactional public boolean verifyEmail(String raw) { AccountActionToken token=usable(raw,AccountActionType.EMAIL_VERIFICATION); token.getUser().setEmailVerified(true); token.markUsed(); tokens.invalidateActiveForUser(token.getUser().getId(),AccountActionType.EMAIL_VERIFICATION); return true; }
    @Transactional public void resendVerification(String input) { users.findByEmail(normalize(input)).ifPresent(this::sendVerification); }
    @Transactional public String issueOauthExchange(User user) { return issue(user,AccountActionType.OAUTH_EXCHANGE,5); }
    @Transactional public User consumeOauthExchange(String raw) { AccountActionToken token=usable(raw,AccountActionType.OAUTH_EXCHANGE); token.markUsed(); return token.getUser(); }
    private String issue(User user, AccountActionType type, int minutes) { tokens.invalidateActiveForUser(user.getId(),type); byte[] bytes=new byte[32]; random.nextBytes(bytes); String raw=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); tokens.save(new AccountActionToken(user,hash(raw),type,LocalDateTime.now().plusMinutes(minutes))); return raw; }
    private AccountActionToken usable(String raw, AccountActionType type) { return tokens.findByTokenHashAndActionType(hash(raw),type).filter(AccountActionToken::isUsable).orElseThrow(() -> new IllegalArgumentException("This link is invalid or has expired.")); }
    private static String hash(String raw) { try { byte[] digest=MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8)); return java.util.HexFormat.of().formatHex(digest); } catch(Exception ex){throw new IllegalStateException(ex);} }
    private static String normalize(String email){return email.trim().toLowerCase(Locale.ROOT);}
}
