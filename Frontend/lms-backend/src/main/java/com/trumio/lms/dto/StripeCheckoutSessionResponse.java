package com.trumio.lms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class StripeCheckoutSessionResponse {
    private String sessionId;
    private String url;
}

