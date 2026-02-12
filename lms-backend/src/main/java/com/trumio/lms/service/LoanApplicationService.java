package com.trumio.lms.service;

import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.LoanApplicationRequest;
import com.trumio.lms.entity.Customer;
import com.trumio.lms.entity.LoanApplication;
import com.trumio.lms.entity.LoanProduct;
import com.trumio.lms.entity.User;
import com.trumio.lms.entity.enums.KYCStatus;
import com.trumio.lms.entity.enums.LoanStatus;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.repository.LoanApplicationRepository;
import com.trumio.lms.repository.CustomerRepository;
import com.trumio.lms.repository.UserRepository;
import com.trumio.lms.util.EMICalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Arrays;

@Service
@RequiredArgsConstructor
public class LoanApplicationService {

    private final LoanApplicationRepository loanApplicationRepository;
    private final CustomerService customerService;
    private final LoanProductService loanProductService;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public ApiResponse<LoanApplication> createApplication(LoanApplicationRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // Block loan creation unless user KYC is approved
        if (user.getKycStatus() != KYCStatus.APPROVED) {
            throw new BusinessException(ErrorCode.KYC_NOT_VERIFIED);
        }

        Customer customer = customerService.getCurrentCustomer();
        if (customer.getCreditScore() == null) {
            customer.setCreditScore(650 + new java.util.Random().nextInt(251));
            customerRepository.save(customer);
        }

        LoanProduct product = loanProductService.getById(request.getLoanProductId());
        loanProductService.validateProduct(product);

        // Validate amount
        if (request.getRequestedAmount() < product.getMinAmount() ||
                request.getRequestedAmount() > product.getMaxAmount()) {
            throw new BusinessException(ErrorCode.INVALID_LOAN_AMOUNT);
        }

        // Validate tenure
        if (request.getTenure() < product.getMinTenure() ||
                request.getTenure() > product.getMaxTenure()) {
            throw new BusinessException(ErrorCode.INVALID_TENURE);
        }

        // Validate credit score
        if (customer.getCreditScore() < product.getMinCreditScore()) {
            throw new BusinessException(ErrorCode.INSUFFICIENT_CREDIT_SCORE);
        }

        // Block same product if already applied (regardless of status)
        // User can apply for each loan type only once
        List<LoanApplication> existingSameProduct = loanApplicationRepository
                .findByCustomerIdAndLoanProductId(customer.getId(), product.getId());
        if (!existingSameProduct.isEmpty()) {
            throw new BusinessException(ErrorCode.LOAN_ALREADY_EXISTS,
                    "You have already applied for this loan type. Only one application per loan type is allowed.");
        }

        // Calculate EMI
        double emi = EMICalculator.calculateEMI(
                request.getRequestedAmount(),
                product.getInterestRate(),
                request.getTenure()
        );

        LoanApplication application = LoanApplication.builder()
                .customerId(customer.getId())
                .loanProductId(product.getId())
                .loanProductName(product.getName())
                .requestedAmount(request.getRequestedAmount())
                .tenure(request.getTenure())
                .interestRate(product.getInterestRate())
                .emi(emi)
                .status(LoanStatus.DRAFT)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        LoanApplication saved = loanApplicationRepository.save(application);

        auditService.log(customer.getUserId(), "LOAN_CREATED", "LOAN_APPLICATION",
                saved.getId(), "Loan application created");

        return ApiResponse.success("Application created successfully", saved);
    }

    public ApiResponse<LoanApplication> submitApplication(String loanId) {
        Customer customer = customerService.getCurrentCustomer();
        LoanApplication loan = getLoanById(loanId);

        if (!loan.getCustomerId().equals(customer.getId())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED_ACCESS);
        }

        if (loan.getStatus() != LoanStatus.DRAFT) {
            throw new BusinessException(ErrorCode.INVALID_STATE_TRANSITION);
        }

        loan.setStatus(LoanStatus.SUBMITTED);
        loan.setSubmittedAt(LocalDateTime.now());
        loan.setUpdatedAt(LocalDateTime.now());

        LoanApplication saved = loanApplicationRepository.save(loan);

        auditService.log(customer.getUserId(), "LOAN_SUBMITTED", "LOAN_APPLICATION",
                saved.getId(), "Loan application submitted");

        return ApiResponse.success("Application submitted successfully", saved);
    }

    public List<LoanApplication> getCustomerLoans(String customerId) {
        List<LoanApplication> loans = loanApplicationRepository.findByCustomerId(customerId);
        return enrichLoansWithProductNames(loans);
    }

    public List<LoanApplication> getMyLoans() {
        Customer customer = customerService.getCurrentCustomer();
        return getCustomerLoans(customer.getId());
    }

    public LoanApplication getLoanById(String loanId) {
        LoanApplication loan = loanApplicationRepository.findById(loanId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LOAN_NOT_FOUND));
        enrichLoanWithProductName(loan);
        return loan;
    }

    public List<LoanApplication> getLoansByStatus(LoanStatus status) {
        List<LoanApplication> loans = loanApplicationRepository.findByStatus(status);
        return enrichLoansWithProductNames(loans);
    }

    private List<LoanApplication> enrichLoansWithProductNames(List<LoanApplication> loans) {
        for (LoanApplication loan : loans) {
            enrichLoanWithProductName(loan);
        }
        return loans;
    }

    private void enrichLoanWithProductName(LoanApplication loan) {
        if (loan.getLoanProductName() == null || loan.getLoanProductName().isEmpty()) {
            try {
                LoanProduct product = loanProductService.getById(loan.getLoanProductId());
                loan.setLoanProductName(product.getName());
            } catch (Exception e) {
                // If product not found, keep unknown or set default
                if (loan.getLoanProductName() == null) {
                    loan.setLoanProductName("Unknown Loan");
                }
            }
        }
    }
}
