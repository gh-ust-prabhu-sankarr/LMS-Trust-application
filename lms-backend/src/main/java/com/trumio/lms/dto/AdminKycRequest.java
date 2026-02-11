package com.trumio.lms.dto;

import com.trumio.lms.entity.enums.KYCStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminKycRequest {

    @NotNull(message = "Status is required")
    private KYCStatus status; // APPROVED or REJECTED

    private String remarks;
}
