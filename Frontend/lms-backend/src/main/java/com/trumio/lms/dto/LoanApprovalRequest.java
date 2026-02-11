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
public class LoanApprovalRequest {

    @NotNull(message = "Approved amount is required")
    @Positive(message = "Amount must be positive")
    private Double approvedAmount;

    private String comments;
}