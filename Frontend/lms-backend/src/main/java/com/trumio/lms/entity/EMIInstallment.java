package com.trumio.lms.entity;


import com.trumio.lms.entity.enums.EMIStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EMIInstallment {

    private Integer installmentNumber;

    private LocalDate dueDate;

    private Double principalAmount;

    private Double interestAmount;

    private Double totalAmount;

    private Double paidAmount;

    private EMIStatus status;

    private LocalDate paidDate;
}