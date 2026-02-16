package com.trumio.lms.controller;

import com.stripe.exception.StripeException;
import com.trumio.lms.dto.*;
import com.trumio.lms.entity.EMISchedule;
import com.trumio.lms.entity.Repayment;
import com.trumio.lms.entity.User;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.repository.UserRepository;
import com.trumio.lms.service.EMIService;
import com.trumio.lms.service.RepaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/repayments")
@RequiredArgsConstructor
@Slf4j
public class RepaymentController {

    private final RepaymentService repaymentService;
    private final EMIService emiService;
    private final UserRepository userRepository;

    private User resolveCurrentUser(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN, "Missing/invalid authentication");
        }

        String principal = auth.getName(); // username OR email (depends on JWT)

        return userRepository.findByUsername(principal)
                .or(() -> userRepository.findByEmail(principal))
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<Repayment>> makeRepayment(
            Authentication authentication,
            @Valid @RequestBody RepaymentRequest request
    ) {
        User user = resolveCurrentUser(authentication);

        log.info("User {} making MOCK repayment. loanApplicationId={}, amount={}",
                user.getId(), request.getLoanApplicationId(), request.getAmount());

        ApiResponse<Repayment> response = repaymentService.processRepayment(request, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/stripe/checkout-session")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<StripeCheckoutSessionResponse> createStripeCheckoutSession(
            Authentication authentication,
            @Valid @RequestBody StripeCheckoutSessionRequest request
    ) {
        User user = resolveCurrentUser(authentication);

        try {
            log.info("User {} creating Stripe checkout session. loanApplicationId={}, amount={}, successUrl={}",
                    user.getId(), request.getLoanApplicationId(), request.getAmount(), request.getSuccessUrl());

            StripeCheckoutSessionResponse response =
                    repaymentService.createStripeCheckoutSession(request, user.getId());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (StripeException e) {
            log.error("StripeException creating checkout session for userId={}, msg={}",
                    user.getId(), e.getMessage(), e);
            throw new BusinessException(ErrorCode.STRIPE_API_ERROR, e.getMessage());

        } catch (Exception e) {
            log.error("Unexpected error creating checkout session for userId={}", user.getId(), e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Failed to create checkout session");
        }
    }

    @PostMapping("/stripe/confirm")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<Repayment>> confirmStripePayment(
            Authentication authentication,
            @Valid @RequestBody StripeConfirmRequest request
    ) {
        User user = resolveCurrentUser(authentication);

        try {
            log.info("User {} confirming Stripe payment sessionId={}", user.getId(), request.getSessionId());

            ApiResponse<Repayment> response =
                    repaymentService.confirmStripeSession(request.getSessionId(), user.getId());

            return ResponseEntity.ok(response);

        } catch (StripeException e) {
            log.error("StripeException confirming payment for userId={}, sessionId={}, msg={}",
                    user.getId(), request.getSessionId(), e.getMessage(), e);
            throw new BusinessException(ErrorCode.STRIPE_API_ERROR, e.getMessage());

        } catch (Exception e) {
            log.error("Unexpected error confirming payment for userId={}, sessionId={}",
                    user.getId(), request.getSessionId(), e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Failed to confirm payment");
        }
    }

    @PostMapping("/miss/{loanId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<EMISchedule>> markMissed(
            Authentication authentication,
            @PathVariable String loanId
    ) {
        User user = resolveCurrentUser(authentication);
        return ResponseEntity.ok(repaymentService.markMissed(loanId, user.getId()));
    }

    @GetMapping("/loan/{loanId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<Repayment>> getRepaymentsByLoan(
            Authentication authentication,
            @PathVariable String loanId
    ) {
        User user = resolveCurrentUser(authentication);
        log.info("User {} fetching repayments for loan {}", user.getId(), loanId);
        repaymentService.reconcileLoanClosure(loanId, user.getId());
        return ResponseEntity.ok(repaymentService.getRepaymentsByLoan(loanId));
    }

    @GetMapping("/schedule/{loanId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<EMISchedule> getEMISchedule(
            Authentication authentication,
            @PathVariable String loanId
    ) {
        User user = resolveCurrentUser(authentication);
        log.info("User {} fetching EMI schedule for loan {}", user.getId(), loanId);
        repaymentService.reconcileLoanClosure(loanId, user.getId());

        return ResponseEntity.ok(
                emiService.getScheduleByLoanId(loanId)
                        .orElseThrow(() -> new BusinessException(ErrorCode.EMI_NOT_FOUND))
        );
    }
}
