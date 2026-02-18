package com.trumio.lms.controller;


import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.entity.MediaFile;
import com.trumio.lms.entity.User;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.repository.UserRepository;
import com.trumio.lms.service.MediaFileService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class MediaFileController {

    private final MediaFileService mediaFileService;
    private final UserRepository userRepository;

    /**
     * Upload file
     */
    @PostMapping("/upload")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<MediaFile>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("entityType") String entityType,
            @RequestParam("entityId") String entityId,
            @RequestParam(value = "displayName", required = false) String displayName) {

        String userId = getCurrentUserId();
        MediaFile uploaded = mediaFileService.uploadFile(file, entityType, entityId, userId, displayName);

        return ResponseEntity.ok(ApiResponse.success("File uploaded successfully", uploaded));
    }

    /**
     * Download file
     */
    @GetMapping("/download/{fileId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Resource> downloadFile(@PathVariable String fileId) {
        MediaFile mediaFile = mediaFileService.getFileById(fileId);
        byte[] fileData = mediaFileService.downloadFile(fileId);

        ByteArrayResource resource = new ByteArrayResource(fileData);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(mediaFile.getFileType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + mediaFile.getFileName() + "\"")
                .body(resource);
    }

    /**
     * Get files by entity
     */
    @GetMapping("/entity/{entityType}/{entityId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<MediaFile>> getFilesByEntity(
            @PathVariable String entityType,
            @PathVariable String entityId) {

        return ResponseEntity.ok(mediaFileService.getFilesByEntity(entityType, entityId));
    }

    /**
     * Get file metadata
     */
    @GetMapping("/{fileId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MediaFile> getFileMetadata(@PathVariable String fileId) {
        return ResponseEntity.ok(mediaFileService.getFileById(fileId));
    }

    /**
     * Delete file
     */
    @DeleteMapping("/{fileId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<String>> deleteFile(@PathVariable String fileId) {
        String userId = getCurrentUserId();
        mediaFileService.deleteFile(fileId, userId);

        return ResponseEntity.ok(ApiResponse.success("File deleted successfully"));
    }

    private String getCurrentUserId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .map(User::getId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }
}
