/**
 * Example: Loan Application Form with Idempotency
 * Demonstrates real-world usage of the useIdempotentPost hook
 */

import React, { useState } from "react";
import { useIdempotentPost } from "../../hooks/useIdempotentRequest.js";

/**
 * Personal Loan Application Form Component
 * Uses idempotency to prevent duplicate loan applications
 */
export const LoanApplicationFormExample = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    loanType: "PERSONAL",
    amount: "",
    tenure: "",
    purpose: "",
    employmentType: "",
    annualIncome: "",
  });

  const [validationErrors, setValidationErrors] = useState({});

  // Use the idempotent POST hook for loan creation
  const {
    submit: createLoan,
    isLoading,
    error,
    isDuplicateError,
    reset,
  } = useIdempotentPost("/loans", { operationId: "createPersonalLoan" });

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!formData.amount || formData.amount <= 0) {
      errors.amount = "Loan amount is required and must be greater than 0";
    }

    if (!formData.tenure || formData.tenure <= 0) {
      errors.tenure = "Tenure is required";
    }

    if (!formData.purpose) {
      errors.purpose = "Purpose is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const response = await createLoan(formData);
      console.log("Loan application created:", response.data);

      // Clear form on success
      setFormData({
        loanType: "PERSONAL",
        amount: "",
        tenure: "",
        purpose: "",
        employmentType: "",
        annualIncome: "",
      });

      // Call success callback
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (err) {
      console.error("Failed to create loan application:", err);
      // Error is automatically handled and displayed
    }
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Reset form
  const handleReset = () => {
    setFormData({
      loanType: "PERSONAL",
      amount: "",
      tenure: "",
      purpose: "",
      employmentType: "",
      annualIncome: "",
    });
    setValidationErrors({});
    reset();
  };

  return (
    <div className="loan-application-form">
      <h2>Personal Loan Application</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="amount">Loan Amount *</label>
          <input
            id="amount"
            name="amount"
            type="number"
            min="10000"
            max="5000000"
            value={formData.amount}
            onChange={handleChange}
            placeholder="Enter loan amount"
            disabled={isLoading}
          />
          {validationErrors.amount && (
            <p className="error-message">{validationErrors.amount}</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="tenure">Loan Tenure (Months) *</label>
          <input
            id="tenure"
            name="tenure"
            type="number"
            min="6"
            max="84"
            value={formData.tenure}
            onChange={handleChange}
            placeholder="Enter tenure in months"
            disabled={isLoading}
          />
          {validationErrors.tenure && (
            <p className="error-message">{validationErrors.tenure}</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="purpose">Purpose of Loan *</label>
          <select
            id="purpose"
            name="purpose"
            value={formData.purpose}
            onChange={handleChange}
            disabled={isLoading}
          >
            <option value="">Select purpose</option>
            <option value="HOME_RENOVATION">Home Renovation</option>
            <option value="DEBT_CONSOLIDATION">Debt Consolidation</option>
            <option value="MEDICAL">Medical Expenses</option>
            <option value="EDUCATION">Education</option>
            <option value="WEDDING">Wedding</option>
            <option value="OTHER">Other</option>
          </select>
          {validationErrors.purpose && (
            <p className="error-message">{validationErrors.purpose}</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="employmentType">Employment Type</label>
          <select
            id="employmentType"
            name="employmentType"
            value={formData.employmentType}
            onChange={handleChange}
            disabled={isLoading}
          >
            <option value="">Select employment type</option>
            <option value="SALARIED">Salaried</option>
            <option value="SELF_EMPLOYED">Self Employed</option>
            <option value="BUSINESS">Business Owner</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="annualIncome">Annual Income</label>
          <input
            id="annualIncome"
            name="annualIncome"
            type="number"
            value={formData.annualIncome}
            onChange={handleChange}
            placeholder="Enter annual income"
            disabled={isLoading}
          />
        </div>

        {/* Error Messages */}
        {error && !isDuplicateError && (
          <div className="alert alert-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {isDuplicateError && (
          <div className="alert alert-warning">
            <strong>Notice:</strong> Your application is already being
            processed. Please wait...
          </div>
        )}

        {/* Action Buttons */}
        <div className="form-actions">
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? "Submitting Application..." : "Submit Application"}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            className="btn btn-secondary"
          >
            Reset Form
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoanApplicationFormExample;
