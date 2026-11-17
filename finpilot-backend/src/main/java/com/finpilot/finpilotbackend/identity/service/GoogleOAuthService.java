package com.finpilot.finpilotbackend.identity.service;

import com.finpilot.finpilotbackend.identity.entity.User;
import com.finpilot.finpilotbackend.identity.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.SecureRandom; import java.util.Base64; import java.util.Locale;

@Service
public class GoogleOAuthService {
    private final UserRepository users; private final PasswordEncoder passwords; private final SecureRandom random=new SecureRandom();
    public GoogleOAuthService(UserRepository users, PasswordEncoder passwords){this.users=users;this.passwords=passwords;}
    @Transactional public User resolve(OAuth2User principal) {
        String subject=required(principal,"sub"); String email=required(principal,"email").trim().toLowerCase(Locale.ROOT);
        if (!Boolean.TRUE.equals(principal.getAttribute("email_verified"))) throw new IllegalArgumentException("Google did not verify this email address.");
        return users.findByGoogleSubject(subject).orElseGet(() -> users.findByEmail(email).map(existing -> { existing.setGoogleSubject(subject); existing.setEmailVerified(true); return existing; }).orElseGet(() -> {
            String name=(String)principal.getAttribute("name"); if(name==null || name.isBlank()) name=email.substring(0,email.indexOf('@'));
            byte[] secret=new byte[32]; random.nextBytes(secret); User user=new User(email,passwords.encode(Base64.getUrlEncoder().withoutPadding().encodeToString(secret)),name); user.setGoogleSubject(subject); user.setEmailVerified(true); return users.save(user);
        }));
    }
    private static String required(OAuth2User user,String attribute){Object value=user.getAttribute(attribute);if(!(value instanceof String text)||text.isBlank())throw new IllegalArgumentException("Missing Google identity attribute");return text;}
}
