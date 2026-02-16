package com.trumio.lms.entity.enums;

public enum KYCStatus {
    PENDING,
    APPROVED,
    VERIFIED, // legacy value kept for backward compatibility with existing records
    REJECTED
}
