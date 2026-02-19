package com.trumio.lms.dto;


import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanApplicationRequest {

    @NotBlank(message = "Loan product ID is required")
    private String loanProductId;

    @NotNull(message = "Requested amount is required")
    @Positive(message = "Amount must be positive")
    private Double requestedAmount;

    @NotNull(message = "Tenure is required")
    @Positive(message = "Tenure must be positive")
    private Integer tenure;

    private Map<String, String> applicationDetails;
}
