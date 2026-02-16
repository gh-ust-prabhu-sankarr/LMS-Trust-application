package com.trumio.lms.service;

import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.LoanApplicationRequest;
import com.trumio.lms.entity.Customer;
import com.trumio.lms.entity.LoanApplication;
import com.trumio.lms.entity.LoanProduct;
import com.trumio.lms.entity.User;
import com.trumio.lms.entity.enums.KYCStatus;
import com.trumio.lms.entity.enums.LoanStatus;
import com.trumio.lms.entity.enums.Role;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.repository.CustomerRepository;
import com.trumio.lms.repository.LoanApplicationRepository;
import com.trumio.lms.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LoanApplicationServiceTest {

    @Mock
    private LoanApplicationRepository loanApplicationRepository;
    @Mock
    private CustomerService customerService;
    @Mock
    private LoanProductService loanProductService;
    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AuditService auditService;

    @InjectMocks
    private LoanApplicationService loanApplicationService;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createApplication_ShouldCreateDraftLoan() {
        setAuthenticatedUser("alice");

        User user = User.builder().id("u1").role(Role.CUSTOMER).kycStatus(KYCStatus.APPROVED).build();
        Customer customer = Customer.builder().id("c1").userId("u1").creditScore(750).build();
        LoanProduct product = LoanProduct.builder()
                .id("p1")
                .active(true)
                .minAmount(10000.0)
                .maxAmount(500000.0)
                .minTenure(6)
                .maxTenure(60)
                .interestRate(12.0)
                .minCreditScore(700)
                .build();

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(customerService.getCurrentCustomer()).thenReturn(customer);
        when(loanProductService.getById("p1")).thenReturn(product);
        when(loanApplicationRepository.findByCustomerIdAndLoanProductIdAndStatusIn(any(), any(), any())).thenReturn(List.of());
        when(loanApplicationRepository.save(any(LoanApplication.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ApiResponse<LoanApplication> response = loanApplicationService.createApplication(validRequest(100000.0));

        assertTrue(response.isSuccess());
        assertEquals(LoanStatus.DRAFT, response.getData().getStatus());
        verify(auditService).log("u1", "LOAN_CREATED", "LOAN_APPLICATION", response.getData().getId(), "Loan application created");
    }

    @Test
    void createApplication_WhenAmountInvalid_ShouldThrowBusinessException() {
        setAuthenticatedUser("alice");

        User user = User.builder().id("u1").role(Role.CUSTOMER).kycStatus(KYCStatus.APPROVED).build();
        Customer customer = Customer.builder().id("c1").userId("u1").creditScore(750).build();
        LoanProduct product = LoanProduct.builder()
                .id("p1")
                .active(true)
                .minAmount(10000.0)
                .maxAmount(500000.0)
                .minTenure(6)
                .maxTenure(60)
                .interestRate(12.0)
                .minCreditScore(700)
                .build();

        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(customerService.getCurrentCustomer()).thenReturn(customer);
        when(loanProductService.getById("p1")).thenReturn(product);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> loanApplicationService.createApplication(validRequest(5000.0)));

        assertEquals(ErrorCode.INVALID_LOAN_AMOUNT, ex.getErrorCode());
    }

    @Test
    void submitApplication_WhenDifferentCustomer_ShouldThrowBusinessException() {
        Customer current = Customer.builder().id("c1").userId("u1").build();
        LoanApplication loan = LoanApplication.builder().id("l1").customerId("c2").status(LoanStatus.DRAFT).build();

        when(customerService.getCurrentCustomer()).thenReturn(current);
        when(loanApplicationRepository.findById("l1")).thenReturn(Optional.of(loan));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> loanApplicationService.submitApplication("l1"));

        assertEquals(ErrorCode.UNAUTHORIZED_ACCESS, ex.getErrorCode());
    }

    private LoanApplicationRequest validRequest(Double amount) {
        return new LoanApplicationRequest("p1", amount, 12, 1, 1.0f, Map.of("type", "personal"), "alice@test.com");
    }

    private void setAuthenticatedUser(String username) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(username, "pwd"));
        SecurityContextHolder.setContext(context);
    }
}
