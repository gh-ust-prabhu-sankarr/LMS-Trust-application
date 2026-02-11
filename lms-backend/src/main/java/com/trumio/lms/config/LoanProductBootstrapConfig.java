package com.trumio.lms.config;

import com.trumio.lms.entity.LoanProduct;
import com.trumio.lms.repository.LoanProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class LoanProductBootstrapConfig {

    private final LoanProductRepository loanProductRepository;

    @Bean
    CommandLineRunner ensureDefaultLoanProducts() {
        return args -> {
            List<LoanProduct> defaults = List.of(
                    LoanProduct.builder()
                            .name("Business Loan")
                            .description("Scale your enterprise with flexible funding.")
                            .minAmount(100000.0)
                            .maxAmount(10000000.0)
                            .minTenure(12)
                            .maxTenure(84)
                            .interestRate(12.5)
                            .minCreditScore(700)
                            .active(true)
                            .createdAt(LocalDateTime.now())
                            .updatedAt(LocalDateTime.now())
                            .build(),
                    LoanProduct.builder()
                            .name("Education Loan")
                            .description("Finance tuition and related expenses with student-friendly repayment.")
                            .minAmount(50000.0)
                            .maxAmount(7500000.0)
                            .minTenure(12)
                            .maxTenure(240)
                            .interestRate(9.5)
                            .minCreditScore(650)
                            .active(true)
                            .createdAt(LocalDateTime.now())
                            .updatedAt(LocalDateTime.now())
                            .build(),
                    LoanProduct.builder()
                            .name("Personal Loan")
                            .description("Quick unsecured funds for personal goals and urgent needs.")
                            .minAmount(50000.0)
                            .maxAmount(3000000.0)
                            .minTenure(12)
                            .maxTenure(84)
                            .interestRate(11.5)
                            .minCreditScore(680)
                            .active(true)
                            .createdAt(LocalDateTime.now())
                            .updatedAt(LocalDateTime.now())
                            .build(),
                    LoanProduct.builder()
                            .name("Vehicle Loan")
                            .description("Drive your dream vehicle with affordable EMIs.")
                            .minAmount(50000.0)
                            .maxAmount(7500000.0)
                            .minTenure(12)
                            .maxTenure(84)
                            .interestRate(9.0)
                            .minCreditScore(670)
                            .active(true)
                            .createdAt(LocalDateTime.now())
                            .updatedAt(LocalDateTime.now())
                            .build()
            );

            for (LoanProduct product : defaults) {
                if (!loanProductRepository.existsByNameIgnoreCase(product.getName())) {
                    loanProductRepository.save(product);
                    log.info("Seeded default loan product: {}", product.getName());
                }
            }
        };
    }
}

