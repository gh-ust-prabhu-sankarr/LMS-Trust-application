package com.trumio.lms.exception;

import com.trumio.lms.entity.enums.LoanStatus;

public class InvalidStateTransitionException extends BusinessException {
    public InvalidStateTransitionException(LoanStatus from, LoanStatus to) {
        super(ErrorCode.INVALID_STATE_TRANSITION,
                String.format("Cannot transition from %s to %s", from, to));
    }
}
