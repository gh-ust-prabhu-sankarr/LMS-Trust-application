package com.trumio.lms.config;

import com.trumio.lms.entity.enums.Role;
import com.trumio.lms.repository.UserRepository;
import com.trumio.lms.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
@Slf4j
@Configuration
@RequiredArgsConstructor
public class AdminBootstrapConfig {

    private final UserRepository userRepository;
    private final UserService userService;

    @Value("${app.bootstrap.admin.enabled:true}")
    private boolean bootstrapEnabled;

    @Value("${app.bootstrap.admin.username:admin}")
    private String adminUsername;

    @Value("${app.bootstrap.admin.email:admin@lms.com}")
    private String adminEmail;

    @Value("${app.bootstrap.admin.password:Admin@123}")
    private String adminPassword;

    @Bean
    CommandLineRunner ensureAdminUser() {
        return args -> {
            if (!bootstrapEnabled) return;
            if (userRepository.existsByRole(Role.ADMIN)) return;
            userService.createAdmin(adminUsername, adminEmail, adminPassword);
            log.info("Default admin created with username '{}'", adminUsername);
        };
    }
}
