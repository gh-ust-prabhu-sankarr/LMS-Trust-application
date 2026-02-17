package com.trumio.lms.idempotency;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class IdempotencyAspect {

    public IdempotencyAspect() {
        log.warn("Idempotency AOP is disabled because AspectJ classes are unavailable in the current build environment.");
    }
}
