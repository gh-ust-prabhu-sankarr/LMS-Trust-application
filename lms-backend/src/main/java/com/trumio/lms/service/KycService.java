package com.trumio.lms.service;

import com.trumio.lms.dto.AdminKycRequest;
import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.KycRequest;
import com.trumio.lms.dto.KycResponse;
import com.trumio.lms.entity.Customer;
import com.trumio.lms.entity.Kyc;
import com.trumio.lms.entity.MediaFile;
import com.trumio.lms.entity.User;
import com.trumio.lms.entity.enums.KYCStatus;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.repository.CustomerRepository;
import com.trumio.lms.repository.KycRepository;
import com.trumio.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.format.DateTimeParseException;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class KycService {
    private static final DateTimeFormatter KYC_COOLDOWN_DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");
    private static final int MAX_KYC_SUBMISSION_ATTEMPTS = 2;
    private static final int KYC_COOLDOWN_MONTHS = 3;

    private final KycRepository kycRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final AuditService auditService;
    private final MediaFileService mediaFileService;

    public ApiResponse<KycResponse> submitKyc(
            KycRequest request,
            MultipartFile panDocument,
            MultipartFile aadhaarDocument) {
        User user = getCurrentUser();
        Optional<Kyc> existingOpt = kycRepository.findByUserId(user.getId());//optional to handle nullpointer
        Kyc existing = existingOpt.orElse(null);

        String pan = request.getPanNumber().trim().toUpperCase();
        String aadhaar = request.getAadhaarNumber().trim();
//pancard validation... //no same ---numbers
        validatePanOwnership(pan, existing);
        validateAadhaarOwnership(aadhaar, existing);
//age validation >18
        LocalDate parsedDob = parseDob(request.getDob());
        validateAge(parsedDob);

        Kyc saved;
        if (existing == null) {
            Kyc kyc = Kyc.builder() //to create new kyc record  from lombok
                    .userId(user.getId())
                    .fullName(request.getFullName().trim())
                    .dob(parsedDob)
                    .panNumber(pan)
                    .aadhaarNumber(aadhaar)
                    .submissionCount(1)
                    .status(KYCStatus.PENDING)
                    .submittedAt(LocalDateTime.now())
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            saved = kycRepository.save(kyc);
        } else {
            int currentCount = existing.getSubmissionCount() == null ? 1 : existing.getSubmissionCount();
            LocalDateTime now = LocalDateTime.now();
            if (currentCount >= MAX_KYC_SUBMISSION_ATTEMPTS) {
                LocalDateTime lastSubmittedAt = existing.getSubmittedAt();
                LocalDateTime nextEligibleAt = (lastSubmittedAt != null ? lastSubmittedAt : now).plusMonths(KYC_COOLDOWN_MONTHS);
                if (now.isBefore(nextEligibleAt)) {
                    throw new BusinessException(
                            ErrorCode.KYC_ALREADY_SUBMITTED,
                            "KYC resubmission is available after " + nextEligibleAt.toLocalDate().format(KYC_COOLDOWN_DATE_FMT)
                    );
                }
                // Cooldown elapsed: start a fresh submission window.
                currentCount = 0;
            }
            existing.setFullName(request.getFullName().trim());
            existing.setDob(parsedDob);
            existing.setPanNumber(pan);
            existing.setAadhaarNumber(aadhaar);
            existing.setSubmissionCount(currentCount + 1);
            existing.setStatus(KYCStatus.PENDING);
            existing.setRemarks(null);
            existing.setReviewedBy(null);
            existing.setReviewedAt(null);
            existing.setSubmittedAt(now);
            existing.setUpdatedAt(now);
            saved = kycRepository.save(existing);
        }

        if (saved.getPanDocumentFileId() != null) {
            try {
                mediaFileService.deleteFile(saved.getPanDocumentFileId(), user.getId());//delete old file if exist
            } catch (Exception ignored) {
            }
        }
        if (saved.getAadhaarDocumentFileId() != null) {
            try {
                mediaFileService.deleteFile(saved.getAadhaarDocumentFileId(), user.getId());
            } catch (Exception ignored) {
            }
        }
        MediaFile panDoc = mediaFileService.uploadKycDocument(panDocument, saved.getId(), user.getId());
        MediaFile aadhaarDoc = mediaFileService.uploadKycDocument(aadhaarDocument, saved.getId(), user.getId());
        saved.setPanDocumentFileId(panDoc.getId());
        saved.setAadhaarDocumentFileId(aadhaarDoc.getId());
        saved.setUpdatedAt(LocalDateTime.now());
        saved = kycRepository.save(saved);

        // Keep user status in sync for authorization checks
        user.setKycStatus(KYCStatus.PENDING);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        // Keep customer status in sync for existing customer-facing views
        customerRepository.findByUserId(user.getId()).ifPresent(customer -> {
            customer.setKycStatus(KYCStatus.PENDING);
            customer.setUpdatedAt(LocalDateTime.now());
            customerRepository.save(customer);
        });

        auditService.log(user.getId(), "KYC_SUBMITTED", "KYC", saved.getId(), "KYC submitted by customer");

        return ApiResponse.success("KYC submitted successfully", toResponse(saved));//Convert a Kyc entity into a KycResponse DTO.
    }

    public KycResponse getMyKyc() {
        User user = getCurrentUser();
        Kyc kyc = kycRepository.findByUserId(user.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "KYC not found"));
        return toResponse(kyc);
    }
    //for admin vieww ---pending/approved
    public List<KycResponse> getByStatus(KYCStatus status) {
        return kycRepository.findByStatus(status).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public ApiResponse<KycResponse> verifyKyc(String kycId, AdminKycRequest request) {
        Kyc kyc = kycRepository.findById(kycId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "KYC record not found"));

        if (request.getStatus() != KYCStatus.APPROVED && request.getStatus() != KYCStatus.REJECTED) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Status must be APPROVED or REJECTED");
        }

        User admin = getCurrentUser();
        kyc.setStatus(request.getStatus());
        kyc.setRemarks(request.getRemarks());
        kyc.setReviewedBy(admin.getId());
        kyc.setReviewedAt(LocalDateTime.now());
        kyc.setUpdatedAt(LocalDateTime.now());

        Kyc saved = kycRepository.save(kyc);

        User targetUser = userRepository.findById(saved.getUserId())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        targetUser.setKycStatus(saved.getStatus());
        targetUser.setUpdatedAt(LocalDateTime.now());
        userRepository.save(targetUser);
//credit score  generation
        customerRepository.findByUserId(saved.getUserId()).ifPresent(customer -> {
            customer.setKycStatus(saved.getStatus());
            if (saved.getStatus() == KYCStatus.APPROVED && customer.getCreditScore() == null) {
                customer.setCreditScore(650 + new java.util.Random().nextInt(151));
            }
            customer.setUpdatedAt(LocalDateTime.now());
            customerRepository.save(customer);
        });

        auditService.log(admin.getId(), "KYC_" + saved.getStatus().name(), "KYC", saved.getId(),
                "KYC marked as " + saved.getStatus().name());

        return ApiResponse.success("KYC updated successfully", toResponse(saved));
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }

    private LocalDate parseDob(String dob) {
        try {
            return LocalDate.parse(dob);
        } catch (DateTimeParseException ex) {
            throw new BusinessException(ErrorCode.INVALID_DOB_FORMAT, "DOB must be in yyyy-MM-dd format");
        }
    }

    private void validateAge(LocalDate dob) {
        int age = Period.between(dob, LocalDate.now()).getYears();
        if (age < 18) {
            throw new BusinessException(ErrorCode.AGE_RESTRICTION, "User must be at least 18 years old");
        }
    }

    private void validatePanOwnership(String panNumber, Kyc existing) {
        Optional<Kyc> panOwner = kycRepository.findByPanNumber(panNumber);
        if (panOwner.isPresent() && (existing == null || !panOwner.get().getId().equals(existing.getId()))) {
            throw new BusinessException(ErrorCode.INVALID_PAN, "PAN already used");
        }
    }

    private void validateAadhaarOwnership(String aadhaarNumber, Kyc existing) {
        Optional<Kyc> aadhaarOwner = kycRepository.findByAadhaarNumber(aadhaarNumber);
        if (aadhaarOwner.isPresent() && (existing == null || !aadhaarOwner.get().getId().equals(existing.getId()))) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Aadhaar already used");
        }
    }

    private KycResponse toResponse(Kyc kyc) {
        return KycResponse.builder()
                .id(kyc.getId())
                .userId(kyc.getUserId())
                .fullName(kyc.getFullName())
                .dob(kyc.getDob())
                .panNumber(kyc.getPanNumber())
                .aadhaarNumber(kyc.getAadhaarNumber())
                .panDocumentFileId(kyc.getPanDocumentFileId())
                .aadhaarDocumentFileId(kyc.getAadhaarDocumentFileId())
                .submissionCount(kyc.getSubmissionCount())
                .status(kyc.getStatus())
                .remarks(kyc.getRemarks())
                .reviewedBy(kyc.getReviewedBy())
                .submittedAt(kyc.getSubmittedAt())
                .reviewedAt(kyc.getReviewedAt())
                .createdAt(kyc.getCreatedAt())
                .updatedAt(kyc.getUpdatedAt())
                .build();
    }
}
