package com.trumio.lms.dto;


import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanProductRequest {

    @NotBlank(message = "Product name is required")
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
}