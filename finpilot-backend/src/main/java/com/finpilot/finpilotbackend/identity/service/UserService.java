package com.finpilot.finpilotbackend.identity.service;

import com.finpilot.finpilotbackend.identity.dto.RegisterRequest;
import com.finpilot.finpilotbackend.identity.dto.UserResponse;
import com.finpilot.finpilotbackend.identity.entity.User;
import com.finpilot.finpilotbackend.identity.exception.EmailAlreadyExistsException;
import com.finpilot.finpilotbackend.identity.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        String email = request.getEmail().trim().toLowerCase();

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
            throw new EmailAlreadyExistsException(email);
        }
    }
}
