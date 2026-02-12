package com.trumio.lms.service;

import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.RepaymentRequest;
import com.trumio.lms.entity.Customer;
import com.trumio.lms.entity.EMIInstallment;
import com.trumio.lms.entity.EMISchedule;
import com.trumio.lms.entity.LoanApplication;
import com.trumio.lms.entity.Repayment;
import com.trumio.lms.entity.User;
import com.trumio.lms.entity.enums.EMIStatus;
import com.trumio.lms.entity.enums.RepaymentStatus;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.repository.CustomerRepository;
import com.trumio.lms.repository.EMIScheduleRepository;
import com.trumio.lms.repository.LoanApplicationRepository;
import com.trumio.lms.repository.RepaymentRepository;
import com.trumio.lms.repository.UserRepository;
import com.trumio.lms.service.mock.PaymentGatewayService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RepaymentServiceTest {

    @Mock
    private RepaymentRepository repaymentRepository;
    @Mock
    private EMIScheduleRepository emiScheduleRepository;
    @Mock
    private LoanApplicationRepository loanApplicationRepository;
    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PaymentGatewayService paymentGatewayService;
    @Mock
    private AuditService auditService;

    @InjectMocks
    private RepaymentService repaymentService;

    @Test
    void processRepayment_ShouldDebitBorrowerAndUpdateSchedule() {
        RepaymentRequest request = new RepaymentRequest("l1", 500.0);

        EMIInstallment installment = EMIInstallment.builder()
                .installmentNumber(1)
                .totalAmount(1000.0)
                .paidAmount(0.0)
                .status(EMIStatus.PENDING)
                .dueDate(LocalDate.now())
                .build();
        EMISchedule schedule = EMISchedule.builder().loanApplicationId("l1").installments(List.of(installment)).build();

        LoanApplication loan = LoanApplication.builder().id("l1").customerId("c1").reviewedBy("o1").build();
        Customer borrower = Customer.builder().id("c1").userId("u1").walletBalance(2000.0).creditScore(700).build();
        User officer = User.builder().id("o1").walletBalance(100.0).build();

        when(emiScheduleRepository.findByLoanApplicationId("l1")).thenReturn(Optional.of(schedule));
        when(paymentGatewayService.processPayment("l1", 500.0)).thenReturn("TXN1");
        when(repaymentRepository.save(any(Repayment.class))).thenAnswer(invocation -> {
            Repayment r = invocation.getArgument(0);
            r.setId("r1");
            r.setStatus(RepaymentStatus.SUCCESS);
            return r;
        });
        when(loanApplicationRepository.findById("l1")).thenReturn(Optional.of(loan));
        when(customerRepository.findById("c1")).thenReturn(Optional.of(borrower));
        when(customerRepository.save(any(Customer.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findById("o1")).thenReturn(Optional.of(officer));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ApiResponse<Repayment> response = repaymentService.processRepayment(request, "u1");

        assertTrue(response.isSuccess());
        assertEquals("r1", response.getData().getId());
        assertEquals(1500.0, borrower.getWalletBalance());
        verify(emiScheduleRepository).save(any(EMISchedule.class));
    }

    @Test
    void processRepayment_WhenUnauthorizedUser_ShouldThrowBusinessException() {
        RepaymentRequest request = new RepaymentRequest("l1", 500.0);
        EMISchedule schedule = EMISchedule.builder().loanApplicationId("l1").installments(List.of()).build();
        LoanApplication loan = LoanApplication.builder().id("l1").customerId("c1").build();
        Customer borrower = Customer.builder().id("c1").userId("owner-user").walletBalance(2000.0).build();

        when(emiScheduleRepository.findByLoanApplicationId("l1")).thenReturn(Optional.of(schedule));
        when(paymentGatewayService.processPayment("l1", 500.0)).thenReturn("TXN1");
        when(repaymentRepository.save(any(Repayment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(loanApplicationRepository.findById("l1")).thenReturn(Optional.of(loan));
        when(customerRepository.findById("c1")).thenReturn(Optional.of(borrower));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> repaymentService.processRepayment(request, "another-user"));

        assertEquals(ErrorCode.UNAUTHORIZED_ACCESS, ex.getErrorCode());
    }
}
