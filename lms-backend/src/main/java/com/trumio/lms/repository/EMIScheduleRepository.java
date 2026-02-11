package com.trumio.lms.repository;

import com.trumio.lms.entity.EMISchedule;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EMIScheduleRepository extends MongoRepository<EMISchedule, String> {
    Optional<EMISchedule> findByLoanApplicationId(String loanApplicationId);
}
