package com.trumio.lms.repository;


import com.trumio.lms.entity.Repayment;
import com.trumio.lms.entity.enums.RepaymentStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RepaymentRepository extends MongoRepository<Repayment, String> {
    List<Repayment> findByLoanApplicationId(String loanApplicationId);
    Optional<Repayment> findByTransactionId(String transactionId);
    List<Repayment> findByStatus(RepaymentStatus status);
}
