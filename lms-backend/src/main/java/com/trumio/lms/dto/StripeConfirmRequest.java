package com.trumio.lms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class StripeConfirmRequest {
    @NotBlank
    private String sessionId;
}

