package com.trumio.lms.service;

import com.trumio.lms.entity.MediaFile;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.repository.MediaFileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MediaFileServiceTest {

    @Mock
    private MediaFileRepository mediaFileRepository;
    @Mock
    private AuditService auditService;

    @InjectMocks
    private MediaFileService mediaFileService;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(mediaFileService, "uploadDir", tempDir.toString());
    }

    @Test
    void uploadFile_ShouldStoreFileAndMetadata() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "doc.pdf",
                "application/pdf",
                "hello".getBytes()
        );

        when(mediaFileRepository.save(any(MediaFile.class))).thenAnswer(invocation -> {
            MediaFile mf = invocation.getArgument(0);
            mf.setId("f1");
            return mf;
        });

        MediaFile saved = mediaFileService.uploadFile(file, "KYC_DOCUMENT", "k1", "u1");

        assertEquals("f1", saved.getId());
        assertTrue(Files.exists(Path.of(saved.getStoragePath())));
        verify(auditService).log("u1", "FILE_UPLOADED", "KYC_DOCUMENT", "k1", "File uploaded: doc.pdf");
    }

    @Test
    void uploadKycDocument_WhenEmpty_ShouldThrowBusinessException() {
        BusinessException ex = assertThrows(BusinessException.class,
                () -> mediaFileService.uploadKycDocument(new MockMultipartFile("file", new byte[0]), "k1", "u1"));

        assertEquals(ErrorCode.VALIDATION_ERROR, ex.getErrorCode());
    }

    @Test
    void downloadFile_ShouldReturnContent() throws Exception {
        Path filePath = tempDir.resolve("test.pdf");
        byte[] bytes = "content".getBytes();
        Files.write(filePath, bytes);

        MediaFile mediaFile = MediaFile.builder().id("f1").storagePath(filePath.toString()).build();
        when(mediaFileRepository.findById("f1")).thenReturn(Optional.of(mediaFile));

        byte[] result = mediaFileService.downloadFile("f1");

        assertArrayEquals(bytes, result);
    }
}
