package com.trumio.lms.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // Authentication & Authorization
    INVALID_CREDENTIALS("AUTH_001", "Invalid email or password", HttpStatus.UNAUTHORIZED),
    USER_NOT_FOUND("AUTH_002", "User not found", HttpStatus.NOT_FOUND),
    USER_ALREADY_EXISTS("AUTH_003", "User already exists", HttpStatus.CONFLICT),
    INVALID_TOKEN("AUTH_004", "Invalid or expired token", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED_ACCESS("AUTH_005", "Unauthorized access", HttpStatus.FORBIDDEN),

    // Customer
    CUSTOMER_NOT_FOUND("CUST_001", "Customer not found", HttpStatus.NOT_FOUND),
    KYC_NOT_VERIFIED("CUST_002", "KYC must be APPROVED to perform this action", HttpStatus.BAD_REQUEST),
    INVALID_PAN("CUST_003", "Invalid PAN number", HttpStatus.BAD_REQUEST),
    KYC_ALREADY_SUBMITTED("CUST_004", "KYC already submitted", HttpStatus.CONFLICT),
    INVALID_DOB_FORMAT("CUST_005", "DOB must be in yyyy-MM-dd format", HttpStatus.BAD_REQUEST),
    AGE_RESTRICTION("CUST_006", "User must be at least 18 years old", HttpStatus.BAD_REQUEST),

    // Loan Product
    PRODUCT_NOT_FOUND("PROD_001", "Loan product not found", HttpStatus.NOT_FOUND),
    PRODUCT_INACTIVE("PROD_002", "Loan product is inactive", HttpStatus.BAD_REQUEST),

    // Loan Application
    LOAN_NOT_FOUND("LOAN_001", "Loan application not found", HttpStatus.NOT_FOUND),
    INVALID_LOAN_AMOUNT("LOAN_002", "Loan amount outside allowed range", HttpStatus.BAD_REQUEST),
    INVALID_TENURE("LOAN_003", "Tenure outside allowed range", HttpStatus.BAD_REQUEST),
    INSUFFICIENT_CREDIT_SCORE("LOAN_004", "Credit score below minimum requirement", HttpStatus.BAD_REQUEST),
    INVALID_STATE_TRANSITION("LOAN_005", "Invalid loan status transition", HttpStatus.BAD_REQUEST),
    LOAN_ALREADY_EXISTS("LOAN_006", "Active loan already exists", HttpStatus.CONFLICT),
    EMI_EXCEEDS_INCOME_LIMIT("LOAN_007", "EMI exceeds 40% of monthly income", HttpStatus.BAD_REQUEST),

    // Repayment
    REPAYMENT_FAILED("PAY_001", "Payment processing failed", HttpStatus.BAD_REQUEST),
    INVALID_AMOUNT("PAY_002", "Invalid payment amount", HttpStatus.BAD_REQUEST),
    EMI_NOT_FOUND("PAY_003", "EMI installment not found", HttpStatus.NOT_FOUND),
    INSUFFICIENT_WALLET_BALANCE("PAY_004", "Insufficient wallet balance", HttpStatus.BAD_REQUEST),

    // Stripe / Payment Gateway
    STRIPE_API_ERROR("PAY_005", "Stripe payment processing error", HttpStatus.BAD_GATEWAY),
    STRIPE_SESSION_NOT_FOUND("PAY_006", "Stripe session not found", HttpStatus.NOT_FOUND),
    STRIPE_PAYMENT_NOT_COMPLETED("PAY_007", "Stripe payment not completed", HttpStatus.BAD_REQUEST),

    // Media
    FILE_UPLOAD_FAILED("FILE_001", "File upload failed", HttpStatus.INTERNAL_SERVER_ERROR),
    FILE_NOT_FOUND("FILE_002", "File not found", HttpStatus.NOT_FOUND),
    INVALID_FILE_TYPE("FILE_003", "Invalid file type", HttpStatus.BAD_REQUEST),



    //Idempotency
    DUPLICATE_REQUEST("IDP_001", "Request is currently being processed", HttpStatus.CONFLICT),

    // General
    VALIDATION_ERROR("GEN_001", "Validation failed", HttpStatus.BAD_REQUEST),
    INTERNAL_ERROR("GEN_002", "Internal server error", HttpStatus.INTERNAL_SERVER_ERROR),
    RESOURCE_NOT_FOUND("GEN_003", "Resource not found", HttpStatus.NOT_FOUND);

    private final String code;
    private final String message;
    private final HttpStatus status;
}
