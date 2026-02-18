package com.trumio.lms.service;



//import com.loanapp.entity.MediaFile;
//import com.loanapp.exception.BusinessException;
//import com.loanapp.exception.ErrorCode;
//import com.loanapp.repository.MediaFileRepository;
//import com.loanapp.util.ValidationUtil;
import com.trumio.lms.entity.MediaFile;
import com.trumio.lms.entity.LoanApplication;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.repository.LoanApplicationRepository;
import com.trumio.lms.repository.MediaFileRepository;
import com.trumio.lms.util.Constants;
import com.trumio.lms.util.ValidationUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor //Lombok
public class MediaFileService {

    private final MediaFileRepository mediaFileRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final AuditService auditService;

    @Value("${app.file.upload-dir:./uploads}") //Reads value from application.yml / application.propertie
    private String uploadDir;

    /**
     * Upload file
     */
    public MediaFile uploadFile(MultipartFile file, String entityType, String entityId, String userId) {
        return uploadFile(file, entityType, entityId, userId, null);
    }

    /**
     * Upload file with optional display name
     */
    public MediaFile uploadFile(MultipartFile file, String entityType, String entityId, String userId, String displayName) {
        // Validate file
        ValidationUtil.validateFileType(file.getContentType());
        ValidationUtil.validateFileSize(file.getSize());

        // Generate unique filename
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename != null ?
                originalFilename.substring(originalFilename.lastIndexOf(".")) : "";
        String filename = UUID.randomUUID().toString() + extension;

        // Create upload directory if not exists
        Path uploadPath = Paths.get(uploadDir);
        try {
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Save file to disk
            Path filePath = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), filePath);//saving to upload  Give me a stream of bytes from the uploaded file.

            // Save metadata to database
            String resolvedDisplayName = (displayName != null && !displayName.isBlank())
                    ? displayName.trim()
                    : (originalFilename != null ? originalFilename : filename);

            MediaFile mediaFile = MediaFile.builder()
                    .fileName(originalFilename != null ? originalFilename : filename)
                    .displayName(resolvedDisplayName)
                    .fileType(file.getContentType())
                    .fileSize(file.getSize())
                    .storagePath(filePath.toString())
                    .entityType(entityType)
                    .entityId(entityId)
                    .uploadedBy(userId)
                    .uploadedAt(LocalDateTime.now())
                    .build();

            MediaFile saved = mediaFileRepository.save(mediaFile); //save to mongooo


            auditService.log(userId, "FILE_UPLOADED", entityType, entityId,
                    "File uploaded: " + originalFilename);

            return saved;

        } catch (IOException e) {
            throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED,
                    "Failed to upload file: " + e.getMessage());
        }
    }

    public MediaFile uploadKycDocument(MultipartFile file, String kycId, String userId) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "KYC document is required");
        }
        ValidationUtil.validateKycPdf(file.getSize(), file.getContentType());
        return uploadFile(file, Constants.ENTITY_KYC_DOCUMENT, kycId, userId);
    }

    /**
     * Get file by ID
     */
    public MediaFile getFileById(String fileId) {
        return mediaFileRepository.findById(fileId)
                .orElseThrow(() -> new BusinessException(ErrorCode.FILE_NOT_FOUND));
    }

    /**
     * Get files by entity
     */
    public List<MediaFile> getFilesByEntity(String entityType, String entityId) {
        List<MediaFile> files = mediaFileRepository.findByEntityTypeAndEntityId(entityType, entityId);

        // Ensure label-style display names are set for all files.
        for (int i = 0; i < files.size(); i++) {
            MediaFile file = files.get(i);
            file.setDisplayName(generateDisplayName(file, entityType, entityId, i));
        }

        return files;
    }

    /**
     * Generate display name based on file position and type
     */
    private String generateDisplayName(MediaFile file, String entityType, String entityId, int index) {
        if ("LOAN_APPLICATION".equals(entityType)) {
            String uploadedLabel = file.getDisplayName();
            if (uploadedLabel != null && !uploadedLabel.isBlank() && !looksLikeRawFileName(uploadedLabel)) {
                return toLoanDocumentLabel(uploadedLabel);
            }

            List<String> labels = loanApplicationRepository.findById(entityId)
                    .map(LoanApplication::getDocuments)
                    .orElse(null);
            if (labels != null && index < labels.size() && labels.get(index) != null && !labels.get(index).isBlank()) {
                String configured = labels.get(index).trim();
                if (!isGenericDocumentLabel(configured)) {
                    return toLoanDocumentLabel(configured);
                }
            }

            String inferred = inferLoanDocumentLabel(file);
            if (inferred != null) return inferred;

            return "Loan Supporting Document";
        }

        String fileName = file.getFileName();
        if (fileName == null) return "Document";

        // If it's already a readable name (not UUID), return it
        if (!fileName.matches("^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}.*")) {
            return fileName;
        }

        if ("KYC_DOCUMENT".equals(entityType)) {
            return index == 0 ? "PAN Document" : "Aadhaar Document";
        }

        return "Document " + (index + 1);
    }

    private boolean looksLikeRawFileName(String value) {
        return value != null && value.trim().matches(".*\\.[A-Za-z0-9]{2,5}$");
    }

    private boolean isGenericDocumentLabel(String label) {
        if (label == null) return true;
        String lower = label.trim().toLowerCase();
        return lower.matches("^document\\s*\\d*$") || lower.matches("^doc\\s*\\d*$");
    }

    private String inferLoanDocumentLabel(MediaFile file) {
        String[] candidates = new String[] { file.getDisplayName(), file.getFileName() };
        for (String candidate : candidates) {
            if (candidate == null || candidate.isBlank()) continue;

            String normalized = candidate
                    .toLowerCase()
                    .replaceAll("\\.[^.]+$", "")
                    .replace('_', ' ')
                    .replace('-', ' ')
                    .replaceAll("\\s+", " ")
                    .trim();

            if (normalized.contains("aadhaar") || normalized.contains("aadhar")) return "Aadhaar Card Document";
            if (normalized.contains("pan")) return "PAN Card Document";
            if (normalized.contains("gst")) return "GST Certificate";
            if (normalized.contains("bank statement")) return "Bank Statement";
            if (normalized.contains("salary slip") || normalized.contains("payslip")) return "Salary Slip";
            if (normalized.contains("itr") || normalized.contains("income tax return")) return "ITR Document";
            if (normalized.contains("udyam")) return "Udyam Certificate";
        }
        return null;
    }

    private String toLoanDocumentLabel(String rawLabel) {
        if (rawLabel == null) return "Loan Document";
        String label = rawLabel.trim();
        if (label.isBlank()) return "Loan Document";
        // Keep exact application-configured label (e.g., GST Returns, ITR, Promoter KYC)
        return label;
    }

    /**
     * Download file
     */
    public byte[] downloadFile(String fileId) {
        MediaFile mediaFile = getFileById(fileId);

        try {
            Path filePath = Paths.get(mediaFile.getStoragePath());
            return Files.readAllBytes(filePath);
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.FILE_NOT_FOUND,
                    "Failed to read file: " + e.getMessage());
        }
    }

    /**
     * Delete file
     */
    public void deleteFile(String fileId, String userId) {
        MediaFile mediaFile = getFileById(fileId);

        try {
            // Delete from disk
            Path filePath = Paths.get(mediaFile.getStoragePath());
            Files.deleteIfExists(filePath);

            // Delete from database
            mediaFileRepository.delete(mediaFile);

            auditService.log(userId, "FILE_DELETED", mediaFile.getEntityType(),
                    mediaFile.getEntityId(), "File deleted: " + mediaFile.getFileName());

        } catch (IOException e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR,
                    "Failed to delete file: " + e.getMessage());
        }
    }
}
