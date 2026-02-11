package com.trumio.lms.util;

public class Constants {

    // Roles
    public static final String ROLE_CUSTOMER = "CUSTOMER";
    public static final String ROLE_CREDIT_OFFICER = "CREDIT_OFFICER";
    public static final String ROLE_ADMIN = "ADMIN";

    // Entity Types
    public static final String ENTITY_LOAN_APPLICATION = "LOAN_APPLICATION";
    public static final String ENTITY_KYC_DOCUMENT = "KYC_DOCUMENT";
    public static final String ENTITY_CUSTOMER = "CUSTOMER";

    // File Types
    public static final String[] ALLOWED_FILE_TYPES = {"image/jpeg", "image/png", "application/pdf"};
    public static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    public static final long MAX_KYC_PDF_FILE_SIZE = 500 * 1024; // 500KB

    // Audit Actions
    public static final String ACTION_LOGIN = "LOGIN";
    public static final String ACTION_LOAN_CREATED = "LOAN_CREATED";
    public static final String ACTION_LOAN_SUBMITTED = "LOAN_SUBMITTED";
    public static final String ACTION_LOAN_APPROVED = "LOAN_APPROVED";
    public static final String ACTION_LOAN_REJECTED = "LOAN_REJECTED";
    public static final String ACTION_LOAN_DISBURSED = "LOAN_DISBURSED";
    public static final String ACTION_REPAYMENT = "REPAYMENT";

    private Constants() {
        // Private constructor to prevent instantiation
    }
}
