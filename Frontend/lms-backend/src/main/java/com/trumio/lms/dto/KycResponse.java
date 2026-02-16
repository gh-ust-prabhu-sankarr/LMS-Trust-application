package com.trumio.lms.dto;

import com.trumio.lms.entity.enums.KYCStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KycResponse {
    private String id;
    private String userId;
    private String fullName;
    private LocalDate dob;
    private String panNumber;
    private String aadhaarNumber;
    private String panDocumentFileId;
    private String aadhaarDocumentFileId;
    private Integer submissionCount;
    private KYCStatus status;
    private String remarks;
    private String reviewedBy;
    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
