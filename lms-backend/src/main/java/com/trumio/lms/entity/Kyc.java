package com.trumio.lms.entity;

import com.trumio.lms.entity.enums.KYCStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "kyc")
public class Kyc {

    @Id
    private String id;

    @Indexed(unique = true)
    private String userId;

    private String fullName;

    private LocalDate dob;

    @Indexed(unique = true)
    private String panNumber;

    @Indexed(unique = true)
    private String aadhaarNumber;

    private String panDocumentFileId;

    private String aadhaarDocumentFileId;

    private Integer submissionCount;

    @Indexed
    private KYCStatus status;

    private String remarks;

    private String reviewedBy;

    private LocalDateTime submittedAt;

    private LocalDateTime reviewedAt;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
