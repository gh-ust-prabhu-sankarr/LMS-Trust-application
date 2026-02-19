package com.trumio.lms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class StripeCheckoutSessionRequest {
    @NotBlank
    private String loanApplicationId;
    @NotNull
    @Positive
    private Double amount;
    @NotBlank private String successUrl; // must contain {CHECKOUT_SESSION_ID}
    @NotBlank private String cancelUrl;
    @Pattern(regexp = "^(INSTALLMENT|CUSTOM)?$", message = "paymentMode must be INSTALLMENT or CUSTOM")
    private String paymentMode;
    @Min(value = 1, message = "installmentCount must be at least 1")
    @Max(value = 4, message = "installmentCount cannot exceed 4")
    private Integer installmentCount;
}

