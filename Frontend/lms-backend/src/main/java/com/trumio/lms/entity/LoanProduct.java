package com.trumio.lms.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "loan_products")
public class LoanProduct {

    @Id
    private String id;

    private String name;

    private String description;

    private Double minAmount;

    private Double maxAmount;

    private Integer minTenure;

    private Integer maxTenure;

    private Double interestRate;

    private Integer minCreditScore;

    private Boolean active;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}