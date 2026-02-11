package com.trumio.lms.controller;



import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.RepaymentRequest;
import com.trumio.lms.entity.EMISchedule;
import com.trumio.lms.entity.Repayment;
import com.trumio.lms.entity.User;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.repository.UserRepository;
import com.trumio.lms.service.EMIService;
import com.trumio.lms.service.RepaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/repayments")
@RequiredArgsConstructor
public class RepaymentController {

    private final RepaymentService repaymentService;
    private final EMIService emiService;
    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<Repayment>> makeRepayment(@Valid @RequestBody RepaymentRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        return ResponseEntity.ok(repaymentService.processRepayment(request, user.getId()));
    }

    @PostMapping("/miss/{loanId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<EMISchedule>> markMissed(@PathVariable String loanId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        return ResponseEntity.ok(repaymentService.markMissed(loanId, user.getId()));
    }

    @GetMapping("/loan/{loanId}")
    public ResponseEntity<List<Repayment>> getRepaymentsByLoan(@PathVariable String loanId) {
        return ResponseEntity.ok(repaymentService.getRepaymentsByLoan(loanId));
    }

    @GetMapping("/schedule/{loanId}")
    public ResponseEntity<EMISchedule> getEMISchedule(@PathVariable String loanId) {
        return ResponseEntity.ok(emiService.getScheduleByLoanId(loanId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EMI_NOT_FOUND)));
    }
}
