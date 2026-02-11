package com.trumio.lms.service;


import com.trumio.lms.dto.*;
//import com.loanapp.entity.User;
//import com.loanapp.entity.enums.Role;
//import com.loanapp.exception.BusinessException;
//import com.loanapp.exception.ErrorCode;
//import com.loanapp.repository.UserRepository;
//import com.loanapp.security.JwtTokenProvider;
import com.trumio.lms.entity.User;
import com.trumio.lms.entity.enums.Role;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.repository.UserRepository;
import com.trumio.lms.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {
    private static final double INITIAL_CUSTOMER_WALLET = 100_000.0;
    private static final double INITIAL_OFFICER_WALLET = 100_000_000.0;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final AuditService auditService;

    public JwtResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        String token = tokenProvider.generateToken(authentication);

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        auditService.log(user.getId(), "LOGIN", "USER", user.getId(), "User logged in");

        return new JwtResponse(token, user.getUsername(), user.getEmail(), user.getRole().name());
    }

    public ApiResponse<String> signup(SignupRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BusinessException(ErrorCode.USER_ALREADY_EXISTS, "Username already exists");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException(ErrorCode.USER_ALREADY_EXISTS, "Email already exists");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.CUSTOMER)
                .active(true)
                .kycStatus(null)
                .walletBalance(INITIAL_CUSTOMER_WALLET)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        userRepository.save(user);

        return ApiResponse.success("User registered successfully");
    }

    public UserProfileResponse getCurrentUserProfile() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (user.getWalletBalance() == null) {
            double defaultBalance = switch (user.getRole()) {
                case CUSTOMER -> INITIAL_CUSTOMER_WALLET;
                case CREDIT_OFFICER -> INITIAL_OFFICER_WALLET;
                default -> 0.0;
            };
            user.setWalletBalance(defaultBalance);
            user.setUpdatedAt(LocalDateTime.now());
            user = userRepository.save(user);
        }

        return UserProfileResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .kycStatus(user.getKycStatus())
                .active(user.getActive())
                .walletBalance(user.getWalletBalance())
                .build();
    }
}
