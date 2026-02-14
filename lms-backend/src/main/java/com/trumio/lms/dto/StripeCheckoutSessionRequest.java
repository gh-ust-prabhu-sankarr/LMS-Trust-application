package com.trumio.lms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
}

