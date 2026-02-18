package com.trumio.lms.entity;


import com.trumio.lms.entity.enums.KYCStatus;
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
@Document(collection = "customers")
public class Customer {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String fullName;

    @Indexed(unique = true)
    private String phone;

    private String address;

    private String employmentType;

    private Double monthlyIncome;

    private KYCStatus kycStatus;

    private Integer creditScore;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
