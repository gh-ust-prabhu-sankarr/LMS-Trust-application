package com.trumio.lms.util;


//import com.loanapp.entity.Customer;
//import com.loanapp.entity.LoanProduct;
//import com.loanapp.exception.BusinessException;
//import com.loanapp.exception.ErrorCode;

import com.trumio.lms.entity.Customer;
import com.trumio.lms.entity.LoanProduct;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;

import java.util.regex.Pattern;

public class ValidationUtil {

    // Regex patterns
    private static final Pattern PAN_PATTERN = Pattern.compile("[A-Z]{5}[0-9]{4}[A-Z]{1}");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^[0-9]{10}$");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@(.+)$");

    /**
     * Validate PAN number format
     */
    public static boolean isValidPAN(String pan) {
        return pan != null && PAN_PATTERN.matcher(pan).matches();
    }

    /**
     * Validate phone number format
     */
    public static boolean isValidPhone(String phone) {
        return phone != null && PHONE_PATTERN.matcher(phone).matches();
    }

    /**
     * Validate email format
     */
    public static boolean isValidEmail(String email) {
        return email != null && EMAIL_PATTERN.matcher(email).matches();
    }

    /**
     * Validate loan amount against product limits
     */
    public static void validateLoanAmount(Double amount, LoanProduct product) {
        if (amount == null || amount <= 0) {
            throw new BusinessException(ErrorCode.INVALID_LOAN_AMOUNT, "Amount must be positive");
        }

        if (amount < product.getMinAmount() || amount > product.getMaxAmount()) {
            throw new BusinessException(ErrorCode.INVALID_LOAN_AMOUNT,
                    String.format("Amount must be between %.2f and %.2f",
                            product.getMinAmount(), product.getMaxAmount()));
        }
    }

    /**
     * Validate loan tenure against product limits
     */
    public static void validateTenure(Integer tenure, LoanProduct product) {
        if (tenure == null || tenure <= 0) {
            throw new BusinessException(ErrorCode.INVALID_TENURE, "Tenure must be positive");
        }

        if (tenure < product.getMinTenure() || tenure > product.getMaxTenure()) {
            throw new BusinessException(ErrorCode.INVALID_TENURE,
                    String.format("Tenure must be between %d and %d months",
                            product.getMinTenure(), product.getMaxTenure()));
        }
    }

    /**
     * Validate credit score eligibility
     */
    public static void validateCreditScore(Customer customer, LoanProduct product) {
        if (customer.getCreditScore() == null) {
            throw new BusinessException(ErrorCode.INSUFFICIENT_CREDIT_SCORE,
                    "Credit score not available");
        }

        if (customer.getCreditScore() < product.getMinCreditScore()) {
            throw new BusinessException(ErrorCode.INSUFFICIENT_CREDIT_SCORE,
                    String.format("Credit score %d is below minimum required %d",
                            customer.getCreditScore(), product.getMinCreditScore()));
        }
    }

    /**
     * Validate monthly income for loan eligibility
     * Rule: EMI should not exceed 40% of monthly income
     */
    public static void validateIncomeEligibility(Double emi, Double monthlyIncome) {
        if (monthlyIncome == null || monthlyIncome <= 0) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Invalid monthly income");
        }

        double maxAllowedEMI = monthlyIncome * 0.4;
        if (emi > maxAllowedEMI) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    String.format("EMI %.2f exceeds 40%% of monthly income %.2f",
                            emi, monthlyIncome));
        }
    }

    /**
     * Validate repayment amount
     */
    public static void validateRepaymentAmount(Double amount, Double totalDue) {
        if (amount == null || amount <= 0) {
            throw new BusinessException(ErrorCode.INVALID_AMOUNT, "Amount must be positive");
        }

        if (amount > totalDue) {
            throw new BusinessException(ErrorCode.INVALID_AMOUNT,
                    String.format("Amount %.2f exceeds total due %.2f", amount, totalDue));
        }
    }

    /**
     * Validate file type
     */
    public static void validateFileType(String contentType) {
        if (contentType == null) {
            throw new BusinessException(ErrorCode.INVALID_FILE_TYPE, "File type is required");
        }

        boolean valid = false;
        for (String allowedType : Constants.ALLOWED_FILE_TYPES) {
            if (contentType.equals(allowedType)) {
                valid = true;
                break;
            }
        }

        if (!valid) {
            throw new BusinessException(ErrorCode.INVALID_FILE_TYPE,
                    "Only PDF, JPEG, and PNG files are allowed");
        }
    }

    /**
     * Validate file size
     */
    public static void validateFileSize(Long size) {
        if (size == null || size <= 0) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Invalid file size");
        }

        if (size > Constants.MAX_FILE_SIZE) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "File size exceeds maximum limit of 10MB");
        }
    }

    /**
     * Validate KYC document constraints
     */
    public static void validateKycPdf(Long size, String contentType) {
        if (!"application/pdf".equals(contentType)) {
            throw new BusinessException(ErrorCode.INVALID_FILE_TYPE, "KYC documents must be PDF files");
        }
        if (size == null || size <= 0) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Invalid file size");
        }
        if (size > Constants.MAX_KYC_PDF_FILE_SIZE) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "KYC document size must be less than 500KB");
        }
    }

    private ValidationUtil() {
        // Private constructor to prevent instantiation
    }
}
