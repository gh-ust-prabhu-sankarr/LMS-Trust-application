package com.trumio.lms.service;

import com.trumio.lms.dto.AdminKycRequest;
import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.KycRequest;
import com.trumio.lms.dto.KycResponse;
import com.trumio.lms.entity.Customer;
import com.trumio.lms.entity.Kyc;
import com.trumio.lms.entity.User;
import com.trumio.lms.entity.enums.KYCStatus;
import com.trumio.lms.entity.enums.Role;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.repository.CustomerRepository;
import com.trumio.lms.repository.KycRepository;
import com.trumio.lms.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class KycServiceTest {

    @Mock
    private KycRepository kycRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private AuditService auditService;
    @Mock
    private MediaFileService mediaFileService;

    @InjectMocks
    private KycService kycService;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void submitKyc_WhenDobInvalid_ShouldThrowBusinessException() {
        setAuthenticatedUser("alice");
        User user = User.builder().id("u1").username("alice").role(Role.CUSTOMER).build();

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(kycRepository.findByUserId("u1")).thenReturn(Optional.empty());
        when(kycRepository.findByPanNumber("ABCDE1234F")).thenReturn(Optional.empty());
        when(kycRepository.findByAadhaarNumber("123456789012")).thenReturn(Optional.empty());

        KycRequest request = new KycRequest("Alice", "1990/01/01", "ABCDE1234F", "123456789012");
        MockMultipartFile pan = new MockMultipartFile("pan", "pan.pdf", "application/pdf", "x".getBytes());
        MockMultipartFile aadhaar = new MockMultipartFile("aadhaar", "aadhaar.pdf", "application/pdf", "y".getBytes());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> kycService.submitKyc(request, pan, aadhaar));

        assertEquals(ErrorCode.INVALID_DOB_FORMAT, ex.getErrorCode());
    }

    @Test
    void verifyKyc_WhenApproved_ShouldSyncUserAndCustomer() {
        setAuthenticatedUser("admin");

        User admin = User.builder().id("admin1").username("admin").role(Role.ADMIN).build();
        Kyc kyc = Kyc.builder().id("k1").userId("u1").status(KYCStatus.PENDING).dob(LocalDate.of(1990, 1, 1)).build();
        User targetUser = User.builder().id("u1").role(Role.CUSTOMER).build();
        Customer customer = Customer.builder().id("c1").userId("u1").kycStatus(KYCStatus.PENDING).creditScore(null).build();

        when(kycRepository.findById("k1")).thenReturn(Optional.of(kyc));
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(admin));
        when(kycRepository.save(any(Kyc.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findById("u1")).thenReturn(Optional.of(targetUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(customerRepository.findByUserId("u1")).thenReturn(Optional.of(customer));
        when(customerRepository.save(any(Customer.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ApiResponse<KycResponse> response = kycService.verifyKyc("k1", new AdminKycRequest(KYCStatus.APPROVED, "ok"));

        assertTrue(response.isSuccess());
        assertEquals(KYCStatus.APPROVED, response.getData().getStatus());
        assertEquals(KYCStatus.APPROVED, targetUser.getKycStatus());
        assertEquals(KYCStatus.APPROVED, customer.getKycStatus());
        assertNotNull(customer.getCreditScore());
        assertTrue(customer.getCreditScore() >= 650 && customer.getCreditScore() <= 900);
    }

    private void setAuthenticatedUser(String username) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(username, "pwd"));
        SecurityContextHolder.setContext(context);
    }
}
