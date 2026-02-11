package com.trumio.lms.entity;


import com.trumio.lms.entity.enums.RepaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "repayments")
public class Repayment {

    @Id
    private String id;

    @Indexed
    private String loanApplicationId;

    private Double amount;

    private LocalDateTime paymentDate;

    private String transactionId;

    private RepaymentStatus status;

    private LocalDateTime createdAt;
}