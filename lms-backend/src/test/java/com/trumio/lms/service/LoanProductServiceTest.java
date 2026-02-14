package com.trumio.lms.service;

import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.LoanProductRequest;
import com.trumio.lms.entity.LoanProduct;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.repository.LoanProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LoanProductServiceTest {

    @Mock
    private LoanProductRepository loanProductRepository;

    @InjectMocks
    private LoanProductService loanProductService;

    @Test
    void createProduct_ShouldPersistAndReturnSuccessResponse() {
        LoanProductRequest request = new LoanProductRequest(
                "Personal Loan",
                "Quick loan",
                10000.0,
                500000.0,
                6,
                60,
                12.5,
                700
        );

        LoanProduct saved = LoanProduct.builder().id("prod-1").name("Personal Loan").active(true).build();
        when(loanProductRepository.save(any(LoanProduct.class))).thenReturn(saved);

        ApiResponse<LoanProduct> response = loanProductService.createProduct(request);

        assertTrue(response.isSuccess());
        assertEquals("Product created successfully", response.getMessage());
        assertEquals(saved, response.getData());
        verify(loanProductRepository).save(any(LoanProduct.class));
    }

    @Test
    void getById_WhenProductMissing_ShouldThrowBusinessException() {
        when(loanProductRepository.findById("missing")).thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> loanProductService.getById("missing"));

        assertEquals(ErrorCode.PRODUCT_NOT_FOUND, ex.getErrorCode());
    }

    @Test
    void validateProduct_WhenInactive_ShouldThrowBusinessException() {
        LoanProduct inactive = LoanProduct.builder().active(false).build();

        BusinessException ex = assertThrows(BusinessException.class,
                () -> loanProductService.validateProduct(inactive));

        assertEquals(ErrorCode.PRODUCT_INACTIVE, ex.getErrorCode());
    }
}
