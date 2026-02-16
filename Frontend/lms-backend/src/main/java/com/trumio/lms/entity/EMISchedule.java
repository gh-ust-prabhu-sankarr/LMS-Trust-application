package com.trumio.lms.entity;


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
@Document(collection = "emi_schedules")
public class EMISchedule {

    @Id
    private String id;

    @Indexed(unique = true)
    private String loanApplicationId;

    private List<EMIInstallment> installments;

    private Double totalPrincipal;

    private Double totalInterest;

    private LocalDateTime createdAt;
}