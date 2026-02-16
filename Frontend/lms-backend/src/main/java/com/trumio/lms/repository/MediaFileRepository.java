package com.trumio.lms.repository;



import com.trumio.lms.entity.MediaFile;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MediaFileRepository extends MongoRepository<MediaFile, String> {
    List<MediaFile> findByEntityId(String entityId);
    List<MediaFile> findByEntityTypeAndEntityId(String entityType, String entityId);
}