package com.trumio.lms.service;



import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.LoanProductRequest;
import com.trumio.lms.entity.LoanProduct;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.repository.LoanProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LoanProductService {

    private final LoanProductRepository loanProductRepository;

    public ApiResponse<LoanProduct> createProduct(LoanProductRequest request) {
        LoanProduct product = LoanProduct.builder()
                .name(request.getName())
                .description(request.getDescription())
                .minAmount(request.getMinAmount())
                .maxAmount(request.getMaxAmount())
                .minTenure(request.getMinTenure())
                .maxTenure(request.getMaxTenure())
                .interestRate(request.getInterestRate())
                .minCreditScore(request.getMinCreditScore())
                .active(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        LoanProduct saved = loanProductRepository.save(product);
        return ApiResponse.success("Product created successfully", saved);
    }

    public List<LoanProduct> getAllActiveProducts() {
        return loanProductRepository.findByActiveTrue();
    }

    public LoanProduct getById(String productId) {
        return loanProductRepository.findById(productId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PRODUCT_NOT_FOUND));
    }

    public void validateProduct(LoanProduct product) {
        if (!product.getActive()) {
            throw new BusinessException(ErrorCode.PRODUCT_INACTIVE);
        }
    }
}