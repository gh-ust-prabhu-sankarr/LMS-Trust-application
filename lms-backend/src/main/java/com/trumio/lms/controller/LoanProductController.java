package com.trumio.lms.controller;


import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.LoanProductRequest;
import com.trumio.lms.entity.LoanProduct;
import com.trumio.lms.idempotency.Idempotent;
import com.trumio.lms.service.LoanProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class LoanProductController {

    private final LoanProductService loanProductService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Idempotent(entityType = "LoanProduct")
    public ResponseEntity<ApiResponse<LoanProduct>> createProduct(@Valid @RequestBody LoanProductRequest request) {
        return ResponseEntity.ok(loanProductService.createProduct(request));
    }

    @GetMapping
    public ResponseEntity<List<LoanProduct>> getAllActiveProducts() {
        return ResponseEntity.ok(loanProductService.getAllActiveProducts());
    }

    @GetMapping("/{productId}")
    public ResponseEntity<LoanProduct> getProductById(@PathVariable String productId) {
        return ResponseEntity.ok(loanProductService.getById(productId));
    }
}
