package com.trumio.lms.repository;

import com.trumio.lms.entity.Kyc;
import com.trumio.lms.entity.enums.KYCStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface KycRepository extends MongoRepository<Kyc, String> {
    Optional<Kyc> findByUserId(String userId);
    Optional<Kyc> findByPanNumber(String panNumber);
    Optional<Kyc> findByAadhaarNumber(String aadhaarNumber);
    List<Kyc> findByStatus(KYCStatus status);
    boolean existsByUserId(String userId);
    boolean existsByPanNumber(String panNumber);
    boolean existsByAadhaarNumber(String aadhaarNumber);
}
