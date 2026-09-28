package com.finpilot.finpilotbackend.identity.service;

import com.finpilot.finpilotbackend.identity.dto.RegisterRequest;
import com.finpilot.finpilotbackend.identity.dto.UserResponse;
import com.finpilot.finpilotbackend.identity.entity.User;
import com.finpilot.finpilotbackend.identity.exception.EmailAlreadyExistsException;
import com.finpilot.finpilotbackend.identity.repository.UserRepository;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        // Normalise email before the existence check and before storing -
        // prevents "User@example.com" and "user@example.com" being treated
        // as different accounts by the case-sensitive unique index.
        // Locale.ROOT prevents the Turkish-locale dotless-i problem where
        // "I@example.com".toLowerCase() produces "ı@example.com" instead of
        // "i@example.com", which would break the duplicate-account check.
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException(email);
        }

        String hashedPassword = passwordEncoder.encode(request.getPassword());
        User user = new User(email, hashedPassword, request.getFullName().trim());

        try {
            User saved = userRepository.save(user);
            return new UserResponse(saved);
        } catch (DataIntegrityViolationException ex) {
            // The existsByEmail check above is a TOCTOU race: two concurrent
            // registrations with the same email can both pass the check then both
            // try to insert. The unique constraint catches the second one - convert
            // the DB error to the same 409 the explicit check would have returned.
            //
            // Only translate email-uniqueness violations. Any other constraint
            // violation (e.g. a future column length limit not covered by a DTO
            // annotation) must propagate so it isn't misreported as an email conflict.
            if (isDuplicateEmailConstraint(ex)) {
                throw new EmailAlreadyExistsException(email);
            }
            throw ex;
        }
    }

    // Returns true when the violation was caused by the email unique index.
    // Both the V1 constraint (users_email_key) and the V10 functional index
    // (uq_users_email_lower) contain "email" in their names, which is sufficient
    // to distinguish them from unrelated constraints (e.g. full_name length).
    // Re-querying existsByEmail inside the same Postgres transaction after an
    // error is not possible because the transaction is already aborted at that
    // point, so constraint-name matching is the correct approach here.
    private boolean isDuplicateEmailConstraint(DataIntegrityViolationException ex) {
        if (ex.getCause() instanceof ConstraintViolationException cve) {
            String name = cve.getConstraintName();
            return name != null && name.toLowerCase(Locale.ROOT).contains("email");
        }
        return false;
    }
}
