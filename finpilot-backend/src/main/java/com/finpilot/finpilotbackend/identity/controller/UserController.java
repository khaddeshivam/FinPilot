package com.finpilot.finpilotbackend.identity.controller;

import com.finpilot.finpilotbackend.identity.dto.UserResponse;
import com.finpilot.finpilotbackend.identity.entity.User;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal User currentUser) {
        // currentUser is populated by JwtAuthenticationFilter from the token's
        // subject claim - if this endpoint returns data, the whole auth chain
        // (register -> login -> token -> filter -> here) is proven to work.
        return new UserResponse(currentUser);
    }
}
