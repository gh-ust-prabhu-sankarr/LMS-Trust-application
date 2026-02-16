package com.trumio.lms.controller;


import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.CustomerRequest;
import com.trumio.lms.entity.Customer;
import com.trumio.lms.idempotency.Idempotent;
import com.trumio.lms.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping("/profile")
    @PreAuthorize("isAuthenticated()")
    @Idempotent(entityType = "Customer")
    public ResponseEntity<ApiResponse<Customer>> createProfile(@Valid @RequestBody CustomerRequest request) {
        return ResponseEntity.ok(customerService.createProfile(request));
    }

    @GetMapping("/profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Customer> getMyProfile() {
        return ResponseEntity.ok(customerService.getCurrentCustomer());
    }

    @GetMapping("/{customerId}")
    @PreAuthorize("hasAnyRole('CREDIT_OFFICER', 'ADMIN')")
    public ResponseEntity<Customer> getCustomerById(@PathVariable String customerId) {
        return ResponseEntity.ok(customerService.getById(customerId));
    }
}
