package com.trumio.lms.dto;


import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.AssertTrue;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanProductRequest {

    @NotBlank(message = "Product name is required")
    @jakarta.validation.constraints.Pattern(
            regexp = ".*[A-Za-z].*",
            message = "Product name must contain alphabets"
    )
    private String name;

    private String description;

    @NotNull
    @Positive
    private Double minAmount;

    @NotNull
    @Positive
    private Double maxAmount;

    @NotNull
    @Positive
    private Integer minTenure;

    @NotNull
    @Positive
    private Integer maxTenure;

    @NotNull
    @Positive
    private Double interestRate;

    @NotNull
    private Integer minCreditScore;

    @AssertTrue(message = "Min tenure cannot be greater than max tenure")
    public boolean isTenureRangeValid() {
        if (minTenure == null || maxTenure == null) return true;
        return minTenure <= maxTenure;
    }

    @AssertTrue(message = "Min credit score must be at least 650")
    public boolean isCreditScoreValid() {
        if (minCreditScore == null) return true;
        return minCreditScore >= 650;
    }
}
