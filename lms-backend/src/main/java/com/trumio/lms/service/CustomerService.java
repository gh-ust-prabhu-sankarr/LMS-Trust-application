package com.trumio.lms.service;


import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.CustomerRequest;
import com.trumio.lms.entity.Customer;
import com.trumio.lms.entity.User;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.repository.CustomerRepository;
import com.trumio.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final com.trumio.lms.service.mock.CreditScoreService creditScoreService;
    private final AuditService auditService;

    public ApiResponse<Customer> createProfile(CustomerRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (customerRepository.existsByPanNumber(request.getPanNumber())) {
            throw new BusinessException(ErrorCode.INVALID_PAN, "PAN already registered");
        }

        // Mock credit score fetch
        Integer creditScore = creditScoreService.fetchCreditScore(request.getPanNumber());

        Customer customer = Customer.builder()
                .userId(user.getId())
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .panNumber(request.getPanNumber())
                .address(request.getAddress())
                .employmentType(request.getEmploymentType())
                .monthlyIncome(request.getMonthlyIncome())
                .kycStatus(null)
                .creditScore(creditScore)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Customer saved = customerRepository.save(customer);

        auditService.log(user.getId(), "CUSTOMER_CREATED", "CUSTOMER", saved.getId(),
                "Customer profile created");

        return ApiResponse.success("Profile created successfully", saved);
    }

    public Customer getByUserId(String userId) {
        return customerRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CUSTOMER_NOT_FOUND));
    }

    public Customer getById(String customerId) {
        return customerRepository.findById(customerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CUSTOMER_NOT_FOUND));
    }

    public Customer getCurrentCustomer() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        return getByUserId(user.getId());
    }
}
