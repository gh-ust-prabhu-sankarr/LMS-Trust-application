package com.trumio.lms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class KycRequest {

    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "DOB is required in yyyy-MM-dd format")
    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$", message = "DOB must be in yyyy-MM-dd format")
    private String dob;

    @NotBlank(message = "PAN number is required")
    @Pattern(regexp = "^[A-Z]{5}[0-9]{4}[A-Z]$", message = "PAN format must be ABCDE1234F")
    private String panNumber;

    @NotBlank(message = "Aadhaar number is required")
    @Pattern(regexp = "^\\d{12}$", message = "Aadhaar must be exactly 12 digits")
    private String aadhaarNumber;
}
