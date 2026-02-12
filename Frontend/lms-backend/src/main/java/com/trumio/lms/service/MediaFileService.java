package com.trumio.lms.service;



//import com.loanapp.entity.MediaFile;
//import com.loanapp.exception.BusinessException;
//import com.loanapp.exception.ErrorCode;
//import com.loanapp.repository.MediaFileRepository;
//import com.loanapp.util.ValidationUtil;
import com.trumio.lms.entity.MediaFile;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
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
    private final AuditService auditService;

    @Value("${app.file.upload-dir:./uploads}") //Reads value from  / application.propertie ----!= /uploads
    private String uploadDir;

    /**
     * Upload file
     */
    public MediaFile uploadFile(MultipartFile file, String entityType, String entityId, String userId) {
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
            MediaFile mediaFile = MediaFile.builder() //.builder() is used to create object cleanly.
                    .fileName(filename)
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
        return mediaFileRepository.findByEntityTypeAndEntityId(entityType, entityId);
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
