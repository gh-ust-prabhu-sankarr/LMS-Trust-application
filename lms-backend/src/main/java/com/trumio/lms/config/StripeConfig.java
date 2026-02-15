package com.trumio.lms.config;

import com.stripe.Stripe;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class StripeConfig {

    private final StripeProperties props;

    @PostConstruct
    public void init() {
        if (props.getSecretKey() == null || props.getSecretKey().isBlank()) {
            throw new IllegalStateException("Stripe secret-key is missing/blank. Check application.properties");
        }
        Stripe.apiKey = props.getSecretKey();
    }
}
