package com.trumio.lms.entity;



import com.trumio.lms.entity.enums.LoanStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "loan_applications")
public class LoanApplication {

    @Id
    private String id;

    @Indexed
    private String customerId;

    @Indexed
    private String loanProductId;

    private Double requestedAmount;

    private Double approvedAmount;

    private Integer tenure;

    private Double interestRate;

    private Double emi;

    @Indexed
    private LoanStatus status;

    private String reviewedBy;

    private String rejectionReason;

    private LocalDateTime submittedAt;

    private LocalDateTime approvedAt;

    private LocalDateTime disbursedAt;

    private List<String> documents;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}