package com.trumio.lms.repository;

import com.trumio.lms.entity.LoanApplication;
import com.trumio.lms.entity.enums.LoanStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Collection;

@Repository
public interface LoanApplicationRepository extends MongoRepository<LoanApplication, String> {
    List<LoanApplication> findByCustomerId(String customerId);
    List<LoanApplication> findByStatus(LoanStatus status);
    List<LoanApplication> findByCustomerIdAndStatus(String customerId, LoanStatus status);
    List<LoanApplication> findByCustomerIdAndLoanProductId(String customerId, String loanProductId);
    List<LoanApplication> findByCustomerIdAndLoanProductIdAndStatusIn(String customerId, String loanProductId, Collection<LoanStatus> statuses);
}
