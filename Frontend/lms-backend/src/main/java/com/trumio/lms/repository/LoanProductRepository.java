package com.trumio.lms.repository;


import com.trumio.lms.entity.LoanProduct;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoanProductRepository extends MongoRepository<LoanProduct, String> {
    List<LoanProduct> findByActiveTrue();
    boolean existsByNameIgnoreCase(String name);
}
