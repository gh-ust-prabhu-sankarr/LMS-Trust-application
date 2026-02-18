package com.trumio.lms.controller;

import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.JwtResponse;
import com.trumio.lms.dto.LoginRequest;
import com.trumio.lms.dto.SignupRequest;
import com.trumio.lms.dto.UserProfileResponse;
import com.trumio.lms.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
//jwtresponse -> accestoken..role etc
    @PostMapping("/login")
    public ResponseEntity<JwtResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<String>> logout() {
        return ResponseEntity.ok(authService.logout());
    }

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<String>> signup(@Valid @RequestBody SignupRequest request) {
        return ResponseEntity.ok(authService.signup(request));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserProfileResponse> me() {
        return ResponseEntity.ok(authService.getCurrentUserProfile());
    }
}
