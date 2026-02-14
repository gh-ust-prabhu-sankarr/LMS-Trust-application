package com.trumio.lms.service;

import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.LoanApprovalRequest;
import com.trumio.lms.entity.Customer;
import com.trumio.lms.entity.LoanApplication;
import com.trumio.lms.entity.User;
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

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LoanWorkflowServiceTest {

    @Mock
    private LoanApplicationRepository loanApplicationRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private EMIService emiService;
    @Mock
    private AuditService auditService;

    @InjectMocks
    private LoanWorkflowService loanWorkflowService;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void moveToReview_ShouldUpdateStatus() {
        setAuthenticatedUser("officer");

        LoanApplication loan = LoanApplication.builder().id("l1").status(LoanStatus.SUBMITTED).build();
        User officer = User.builder().id("o1").username("officer").role(Role.CREDIT_OFFICER).build();

        when(loanApplicationRepository.findById("l1")).thenReturn(Optional.of(loan));
        when(loanApplicationRepository.save(any(LoanApplication.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findByUsername("officer")).thenReturn(Optional.of(officer));

        ApiResponse<LoanApplication> response = loanWorkflowService.moveToReview("l1");

        assertTrue(response.isSuccess());
        assertEquals(LoanStatus.UNDER_REVIEW, response.getData().getStatus());
    }

    @Test
    void approveLoan_WhenWalletInsufficient_ShouldThrowBusinessException() {
        setAuthenticatedUser("officer");

        LoanApplication loan = LoanApplication.builder().id("l1").status(LoanStatus.UNDER_REVIEW).customerId("c1").build();
        User officer = User.builder().id("o1").username("officer").role(Role.CREDIT_OFFICER).walletBalance(100.0).build();
        Customer borrower = Customer.builder().id("c1").walletBalance(2000.0).build();

        when(loanApplicationRepository.findById("l1")).thenReturn(Optional.of(loan));
        when(userRepository.findByUsername("officer")).thenReturn(Optional.of(officer));
        when(customerRepository.findById("c1")).thenReturn(Optional.of(borrower));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> loanWorkflowService.approveLoan("l1", new LoanApprovalRequest(500.0, "ok")));

        assertEquals(ErrorCode.INSUFFICIENT_WALLET_BALANCE, ex.getErrorCode());
    }

    private void setAuthenticatedUser(String username) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(username, "pwd"));
        SecurityContextHolder.setContext(context);
    }
}
