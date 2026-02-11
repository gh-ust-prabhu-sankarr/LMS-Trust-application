package com.trumio.lms.config;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoRepositories(basePackages = "com.trumio.lms.repository")
@EnableMongoAuditing
public class MongoConfig {
}
