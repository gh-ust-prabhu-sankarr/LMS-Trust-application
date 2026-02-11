package com.trumio.lms.repository;


import com.trumio.lms.entity.Repayment;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RepaymentRepository extends MongoRepository<Repayment, String> {
    List<Repayment> findByLoanApplicationId(String loanApplicationId);
}