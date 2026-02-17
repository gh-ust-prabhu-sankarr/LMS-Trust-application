package com.trumio.lms.repository;

import com.trumio.lms.idempotency.IdempotencyKey;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IdempotencyKeyRepository extends MongoRepository<IdempotencyKey, String> {

    Optional<IdempotencyKey> findByIdempotencyKey(String idempotencyKey);

    Optional<IdempotencyKey> findByIdempotencyKeyAndUserId(String idempotencyKey, String userId);
}