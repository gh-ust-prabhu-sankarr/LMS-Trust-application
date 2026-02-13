package com.trumio.lms.service;


import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.entity.User;
import com.trumio.lms.entity.enums.Role;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {
    private static final double DEFAULT_OFFICER_BANK_BALANCE = 1_000_000_000.0;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    /**
     * Create Credit Officer by Admin
     */
    public ApiResponse<User> createCreditOfficer(String username, String email, String password) {
        if (userRepository.existsByUsername(username)) {
            throw new BusinessException(ErrorCode.USER_ALREADY_EXISTS, "Username already exists");
        }

        if (userRepository.existsByEmail(email)) {
            throw new BusinessException(ErrorCode.USER_ALREADY_EXISTS, "Email already exists");
        }

        User officer = User.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(password))
                .role(Role.CREDIT_OFFICER)
                .active(true)
                .bankBalance(DEFAULT_OFFICER_BANK_BALANCE)
                .kycStatus(null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        User saved = userRepository.save(officer);

        auditService.log(saved.getId(), "OFFICER_CREATED", "USER", saved.getId(),
                "Credit Officer created");

        return ApiResponse.success("Credit Officer created successfully", saved);
    }

    /**
     * Create Admin (system initialization)
     */
    public ApiResponse<User> createAdmin(String username, String email, String password) {
        if (userRepository.existsByUsername(username)) {
            throw new BusinessException(ErrorCode.USER_ALREADY_EXISTS, "Admin already exists");
        }

        User admin = User.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(password))
                .role(Role.ADMIN)
                .active(true)
                .bankBalance(DEFAULT_OFFICER_BANK_BALANCE)
                .kycStatus(null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        User saved = userRepository.save(admin);

        auditService.log(saved.getId(), "ADMIN_CREATED", "USER", saved.getId(),
                "Admin user created");

        return ApiResponse.success("Admin created successfully", saved);
    }

    /**
     * Get user by ID
     */
    public User getUserById(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }

    /**
     * Get user by username
     */
    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }

    /**
     * Activate/Deactivate user
     */
    public ApiResponse<User> toggleUserStatus(String userId, boolean active) {
        User user = getUserById(userId);
        if (user.getRole() == Role.ADMIN) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED_ACCESS, "Admin account status cannot be changed");
        }
        user.setActive(active);
        user.setUpdatedAt(LocalDateTime.now());

        User updated = userRepository.save(user);

        auditService.log(userId, active ? "USER_ACTIVATED" : "USER_DEACTIVATED",
                "USER", userId, "User status changed");

        return ApiResponse.success("User status updated", updated);
    }

    /**
     * Get all users (Admin only)
     */
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    /**
     * Change password
     */
    public ApiResponse<String> changePassword(String userId, String oldPassword, String newPassword) {
        User user = getUserById(userId);

        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS, "Old password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        auditService.log(userId, "PASSWORD_CHANGED", "USER", userId, "Password changed");

        return ApiResponse.success("Password changed successfully");
    }
}
