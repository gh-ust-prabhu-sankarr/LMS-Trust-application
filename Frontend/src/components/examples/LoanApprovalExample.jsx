/**
 * Example: Admin Loan Approval with Idempotency
 * Demonstrates idempotency for administrative actions
 */

import React, { useState } from "react";
import { useIdempotentPost } from "../../hooks/useIdempotentRequest.js";

/**
 * Loan Approval Component
 * Handles loan approval workflow with idempotency protection
 */
export const LoanApprovalExample = ({ loanId, loanDetails, onSuccess }) => {
  const [remarks, setRemarks] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  // Use idempotent POST for approval action
  const {
    submit: approveLoan,
    isLoading,
    error,
    isDuplicateError,
    reset,
  } = useIdempotentPost(`/loans/${loanId}/approve`, {
    operationId: `approveLoan_${loanId}`,
  });

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!remarks.trim()) {
      errors.remarks = "Please add approval remarks";
    }

    if (remarks.length < 10) {
      errors.remarks = "Remarks must be at least 10 characters";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle approval
  const handleApprove = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const approvalData = {
        remarks: remarks.trim(),
        approvedAmount: loanDetails.requestedAmount,
      };

      const response = await approveLoan(approvalData);
      console.log("Loan approved:", response.data);

      // Clear form on success
      setRemarks("");
      setValidationErrors({});

      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (err) {
      console.error("Failed to approve loan:", err);
    }
  };

  // Handle remarks change
  const handleRemarksChange = (e) => {
    setRemarks(e.target.value);
    if (validationErrors.remarks) {
      setValidationErrors((prev) => ({
        ...prev,
        remarks: "",
      }));
    }
  };

  // Reset form
  const handleReset = () => {
    setRemarks("");
    setValidationErrors({});
    reset();
  };

  return (
    <div className="loan-approval">
      <h3>Approve Loan Application</h3>

      {/* Loan Summary */}
      <div className="loan-summary">
        <div className="summary-item">
          <span className="label">Loan ID:</span>
          <span className="value">{loanId}</span>
        </div>
        <div className="summary-item">
          <span className="label">Loan Type:</span>
          <span className="value">{loanDetails?.loanType}</span>
        </div>
        <div className="summary-item">
          <span className="label">Requested Amount:</span>
          <span className="value">
            ₹{loanDetails?.requestedAmount?.toLocaleString()}
          </span>
        </div>
        <div className="summary-item">
          <span className="label">Customer:</span>
          <span className="value">{loanDetails?.customerName}</span>
        </div>
      </div>

      <form onSubmit={handleApprove}>
        <div className="form-group">
          <label htmlFor="remarks">Approval Remarks *</label>
          <textarea
            id="remarks"
            value={remarks}
            onChange={handleRemarksChange}
            placeholder="Enter approval remarks (minimum 10 characters)..."
            rows="6"
            disabled={isLoading}
          />
          <div className="char-count">{remarks.length}/500 characters</div>
          {validationErrors.remarks && (
            <p className="error-message">{validationErrors.remarks}</p>
          )}
        </div>

        {/* Error Messages */}
        {error && !isDuplicateError && (
          <div className="alert alert-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {isDuplicateError && (
          <div className="alert alert-warning">
            <strong>Notice:</strong> This approval is already being processed.
            Please wait...
          </div>
        )}

        {/* Action Buttons */}
        <div className="form-actions">
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-success"
          >
            {isLoading ? "Processing Approval..." : "Approve Loan"}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            className="btn btn-secondary"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoanApprovalExample;
