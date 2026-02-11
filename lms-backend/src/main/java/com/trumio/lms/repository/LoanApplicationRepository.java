package com.trumio.lms.repository;

import com.trumio.lms.entity.LoanApplication;
import com.trumio.lms.entity.enums.LoanStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoanApplicationRepository extends MongoRepository<LoanApplication, String> {
    List<LoanApplication> findByCustomerId(String customerId);
    List<LoanApplication> findByStatus(LoanStatus status);
    List<LoanApplication> findByCustomerIdAndStatus(String customerId, LoanStatus status);
}
