package com.trumio.lms.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "media_files")
public class MediaFile {

    @Id
    private String id;

    private String fileName;

    private String displayName;

    private String fileType;

    private Long fileSize;

    private String storagePath;

    @Indexed
    private String entityType;

    @Indexed
    private String entityId;

    private String uploadedBy;

    private LocalDateTime uploadedAt;
}