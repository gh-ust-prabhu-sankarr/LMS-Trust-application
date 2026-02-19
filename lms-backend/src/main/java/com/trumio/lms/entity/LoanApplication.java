package com.trumio.lms.entity;



import com.trumio.lms.entity.enums.LoanStatus;
import com.trumio.lms.entity.enums.BankDetailsStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

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

    private String loanProductName;

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

    private Boolean agreementAccepted;

    private String agreementAcceptedName;

    private LocalDateTime agreementAcceptedAt;

    private String bankAccountHolderName;

    private String bankBeneficiaryType;

    private String institutionName;

    private String bankName;

    private String bankAccountNumber;

    private String bankIfscCode;

    private String bankBranchName;

    private BankDetailsStatus bankDetailsStatus;

    private String bankDetailsReviewedBy;

    private String bankDetailsRejectionReason;

    private LocalDateTime bankDetailsSubmittedAt;

    private LocalDateTime bankDetailsReviewedAt;

    private List<String> documents;

    private Map<String, String> applicationDetails;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
