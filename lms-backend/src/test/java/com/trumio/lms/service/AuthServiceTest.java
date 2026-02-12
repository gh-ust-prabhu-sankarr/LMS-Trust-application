package com.trumio.lms.service;

import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.JwtResponse;
import com.trumio.lms.dto.LoginRequest;
import com.trumio.lms.dto.SignupRequest;
import com.trumio.lms.dto.UserProfileResponse;
import com.trumio.lms.entity.User;
import com.trumio.lms.entity.enums.Role;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.repository.UserRepository;
import com.trumio.lms.security.JwtTokenProvider;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private JwtTokenProvider tokenProvider;
    @Mock
    private AuditService auditService;

    @InjectMocks
    private AuthService authService;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void signup_ShouldCreateCustomerUser() {
        SignupRequest request = new SignupRequest("alice", "alice@test.com", "secret123");

        when(userRepository.existsByUsername("alice")).thenReturn(false);
        when(userRepository.existsByEmail("alice@test.com")).thenReturn(false);
        when(passwordEncoder.encode("secret123")).thenReturn("encoded");

        ApiResponse<String> response = authService.signup(request);

        assertTrue(response.isSuccess());
        assertEquals("User registered successfully", response.getMessage());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void signup_WhenUsernameExists_ShouldThrowBusinessException() {
        SignupRequest request = new SignupRequest("alice", "alice@test.com", "secret123");
        when(userRepository.existsByUsername("alice")).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class, () -> authService.signup(request));

        assertEquals(ErrorCode.USER_ALREADY_EXISTS, ex.getErrorCode());
    }

    @Test
    void login_ShouldAuthenticateAndReturnJwtResponse() {
        LoginRequest request = new LoginRequest("alice", "secret123");
        Authentication authentication = mock(Authentication.class);
        User user = User.builder().id("u1").username("alice").email("alice@test.com").role(Role.CUSTOMER).build();

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(authentication);
        when(tokenProvider.generateToken(authentication)).thenReturn("jwt-token");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));

        JwtResponse response = authService.login(request);

        assertEquals("jwt-token", response.getToken());
        assertEquals("alice", response.getUsername());
        assertEquals("CUSTOMER", response.getRole());
        verify(auditService).log("u1", "LOGIN", "USER", "u1", "User logged in");
    }

    @Test
    void getCurrentUserProfile_WhenWalletMissing_ShouldInitializeOfficerWallet() {
        setAuthenticatedUser("officer");

        User user = User.builder()
                .id("o1")
                .username("officer")
                .email("officer@test.com")
                .role(Role.CREDIT_OFFICER)
                .active(true)
                .walletBalance(null)
                .build();

        when(userRepository.findByUsername("officer")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserProfileResponse profile = authService.getCurrentUserProfile();

        assertEquals(100000000.0, profile.getWalletBalance());
    }

    private void setAuthenticatedUser(String username) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(username, "pwd"));
        SecurityContextHolder.setContext(context);
    }
}
