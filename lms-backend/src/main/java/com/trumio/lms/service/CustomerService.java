package com.trumio.lms.service;


import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.CustomerRequest;
import com.trumio.lms.entity.Customer;
import com.trumio.lms.entity.User;
import com.trumio.lms.entity.enums.KYCStatus;
import com.trumio.lms.entity.enums.Role;
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
    private final AuditService auditService;

    public ApiResponse<Customer> createProfile(CustomerRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (user.getRole() != Role.CUSTOMER) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED_ACCESS, "Only customers can manage customer profile");
        }

        Customer existing = customerRepository.findByUserId(user.getId()).orElse(null);
        Customer customer = existing != null ? existing : new Customer();
        customer.setUserId(user.getId());
        customer.setFullName(request.getFullName().trim().replaceAll("\\s+", " "));
        customer.setPhone(request.getPhone().trim());
        customer.setAddress(request.getAddress().trim());
        customer.setEmploymentType(request.getEmploymentType().trim().toUpperCase());
        customer.setMonthlyIncome(request.getMonthlyIncome());
        if (customer.getKycStatus() == null) customer.setKycStatus(user.getKycStatus());
        if (customer.getCreatedAt() == null) customer.setCreatedAt(LocalDateTime.now());
        customer.setUpdatedAt(LocalDateTime.now());

        Customer saved = customerRepository.save(customer);

        auditService.log(
                user.getId(),
                existing == null ? "CUSTOMER_CREATED" : "CUSTOMER_UPDATED",
                "CUSTOMER",
                saved.getId(),
                existing == null ? "Customer profile created" : "Customer profile updated"
        );

        return ApiResponse.success(existing == null ? "Profile created successfully" : "Profile updated successfully", saved);
    }

    public Customer getByUserId(String userId) {
        Customer customer = customerRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CUSTOMER_NOT_FOUND));
        if (customer.getKycStatus() == KYCStatus.APPROVED && customer.getCreditScore() == null) {
            customer.setCreditScore(650 + new java.util.Random().nextInt(151));
            customer.setUpdatedAt(LocalDateTime.now());
            customer = customerRepository.save(customer);
        }
        return customer;
    }

    public Customer getById(String customerId) {
        return customerRepository.findById(customerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CUSTOMER_NOT_FOUND));
    }

    public Customer getCurrentCustomer() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (user.getRole() != Role.CUSTOMER) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED_ACCESS, "Only customers can view customer profile");
        }
        return getByUserId(user.getId());
    }
}
