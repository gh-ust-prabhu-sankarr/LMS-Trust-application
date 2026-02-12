package com.trumio.lms.idempotency;


import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to mark endpoints that require idempotency control.
 * Used on controller methods that should not be duplicated (e.g., loan application creation)
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Idempotent {

    /**
     * Entity type for audit tracking
     */
    String entityType() default "";

    /**
     * Whether idempotency key is required
     */
    boolean required() default true;
}