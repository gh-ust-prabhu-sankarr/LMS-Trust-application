package com.trumio.lms.dto;


import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CustomerRequest {

    @NotBlank(message = "Full name is required")
    @Pattern(
            regexp = "^(?=.*[A-Za-z])[A-Za-z. ]+$",
            message = "Legal name must contain alphabets and can include spaces/dots"
    )
    private String fullName;

    @NotBlank(message = "Phone is required")
    @Pattern(regexp = "^[0-9]{10}$", message = "Phone must be 10 digits")
    private String phone;

    @NotBlank(message = "Address is required")
    @Pattern(
            regexp = "^(?=.{5,})(?=.*[A-Za-z])[A-Za-z0-9\\s,/#-]+$",
            message = "Address must include letters and can use numbers, spaces, commas, hyphens, / and #"
    )
    private String address;

    @NotBlank(message = "Employment type is required")
    @Pattern(
            regexp = "^(SALARIED|SELF_EMPLOYED|BUSINESS_OWNER|BUSINESS|STUDENT|UNEMPLOYED|RETIRED)$",
            message = "Employment type is invalid"
    )
    private String employmentType;

    @NotNull(message = "Monthly income is required")
    @Positive(message = "Monthly income must be positive")
    private Double monthlyIncome;
}
