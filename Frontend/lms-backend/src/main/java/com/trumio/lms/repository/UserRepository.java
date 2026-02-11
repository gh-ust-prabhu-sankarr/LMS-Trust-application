package com.trumio.lms.repository;

import com.trumio.lms.entity.User;
import com.trumio.lms.entity.enums.Role;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findFirstByRole(Role role);
    Boolean existsByUsername(String username);
    Boolean existsByEmail(String email);
    Boolean existsByRole(Role role);
}
