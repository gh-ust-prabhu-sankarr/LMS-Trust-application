/**
 * Example: KYC Form with Idempotency and File Upload
 * Demonstrates idempotency with file uploads and FormData
 */

import React, { useState } from "react";
import { useIdempotentPost } from "../../hooks/useIdempotentRequest.js";

/**
 * KYC Submission Form Component
 * Handles document uploads with idempotency protection
 */
export const KycFormExample = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    fullName: "",
    dob: "",
    panNumber: "",
    aadhaarNumber: "",
  });

  const [files, setFiles] = useState({
    panDocument: null,
    aadhaarDocument: null,
  });

  const [fileErrors, setFileErrors] = useState({});
  const [validationErrors, setValidationErrors] = useState({});

  // Use idempotent POST for KYC submission
  const {
    submit: submitKyc,
    isLoading,
    error,
    isDuplicateError,
    reset,
  } = useIdempotentPost("/kyc/submit", { operationId: "submitKyc" });

  // Validate file
  const validateFile = (file, fieldName) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];

    if (!file) {
      return `${fieldName} is required`;
    }

    if (file.size > maxSize) {
      return `${fieldName} must be less than 5MB`;
    }

    if (!allowedTypes.includes(file.type)) {
      return `${fieldName} must be PDF, JPG, or PNG`;
    }

    return null;
  };

  // Validate form
  const validateForm = () => {
    const newValidationErrors = {};
    const newFileErrors = {};

    if (!formData.fullName) {
      newValidationErrors.fullName = "Full name is required";
    }

    if (!formData.dob) {
      newValidationErrors.dob = "Date of birth is required";
    }

    if (!formData.panNumber) {
      newValidationErrors.panNumber = "PAN number is required";
    }

    if (!formData.aadhaarNumber) {
      newValidationErrors.aadhaarNumber = "Aadhaar number is required";
    }

    // Validate files
    const panError = validateFile(files.panDocument, "PAN document");
    if (panError) {
      newFileErrors.panDocument = panError;
    }

    const aadhaarError = validateFile(
      files.aadhaarDocument,
      "Aadhaar document",
    );
    if (aadhaarError) {
      newFileErrors.aadhaarDocument = aadhaarError;
    }

    setValidationErrors(newValidationErrors);
    setFileErrors(newFileErrors);

    return (
      Object.keys(newValidationErrors).length === 0 &&
      Object.keys(newFileErrors).length === 0
    );
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Create FormData for multipart request
      const submitData = new FormData();
      submitData.append("fullName", formData.fullName);
      submitData.append("dob", formData.dob);
      submitData.append("panNumber", formData.panNumber);
      submitData.append("aadhaarNumber", formData.aadhaarNumber);
      submitData.append("panDocument", files.panDocument);
      submitData.append("aadhaarDocument", files.aadhaarDocument);

      // Note: The idempotentPost hook handles FormData correctly
      const response = await submitKyc(submitData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("KYC submitted successfully:", response.data);

      // Reset form on success
      resetForm();

      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (err) {
      console.error("Failed to submit KYC:", err);
    }
  };

  // Handle text input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Handle file changes
  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    const file = selectedFiles?.[0];

    setFiles((prev) => ({
      ...prev,
      [name]: file,
    }));

    // Validate file immediately
    if (file) {
      const error = validateFile(file, name.replace("Document", " Document"));
      if (error) {
        setFileErrors((prev) => ({
          ...prev,
          [name]: error,
        }));
      } else {
        setFileErrors((prev) => ({
          ...prev,
          [name]: "",
        }));
      }
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      fullName: "",
      dob: "",
      panNumber: "",
      aadhaarNumber: "",
    });
    setFiles({
      panDocument: null,
      aadhaarDocument: null,
    });
    setValidationErrors({});
    setFileErrors({});
    reset();
  };

  return (
    <div className="kyc-form">
      <h2>KYC Verification</h2>
      <p className="form-description">
        Please provide your personal information and supporting documents for
        verification.
      </p>

      <form onSubmit={handleSubmit}>
        {/* Personal Information Section */}
        <fieldset>
          <legend>Personal Information</legend>

          <div className="form-group">
            <label htmlFor="fullName">Full Name *</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter full name"
              disabled={isLoading}
            />
            {validationErrors.fullName && (
              <p className="error-message">{validationErrors.fullName}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="dob">Date of Birth *</label>
            <input
              id="dob"
              name="dob"
              type="date"
              value={formData.dob}
              onChange={handleChange}
              disabled={isLoading}
            />
            {validationErrors.dob && (
              <p className="error-message">{validationErrors.dob}</p>
            )}
          </div>
        </fieldset>

        {/* Document Information Section */}
        <fieldset>
          <legend>Document Information</legend>

          <div className="form-group">
            <label htmlFor="panNumber">PAN Number *</label>
            <input
              id="panNumber"
              name="panNumber"
              type="text"
              value={formData.panNumber}
              onChange={handleChange}
              placeholder="e.g., AAAA12345B"
              pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
              disabled={isLoading}
            />
            {validationErrors.panNumber && (
              <p className="error-message">{validationErrors.panNumber}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="aadhaarNumber">Aadhaar Number *</label>
            <input
              id="aadhaarNumber"
              name="aadhaarNumber"
              type="text"
              value={formData.aadhaarNumber}
              onChange={handleChange}
              placeholder="e.g., 1234 5678 9012"
              pattern="[0-9]{4}\s?[0-9]{4}\s?[0-9]{4}"
              disabled={isLoading}
            />
            {validationErrors.aadhaarNumber && (
              <p className="error-message">{validationErrors.aadhaarNumber}</p>
            )}
          </div>
        </fieldset>

        {/* Documents Section */}
        <fieldset>
          <legend>Upload Documents</legend>

          <div className="form-group">
            <label htmlFor="panDocument">PAN Document *</label>
            <input
              id="panDocument"
              name="panDocument"
              type="file"
              accept="application/pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              disabled={isLoading}
            />
            {files.panDocument && (
              <p className="file-info">Selected: {files.panDocument.name}</p>
            )}
            {fileErrors.panDocument && (
              <p className="error-message">{fileErrors.panDocument}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="aadhaarDocument">Aadhaar Document *</label>
            <input
              id="aadhaarDocument"
              name="aadhaarDocument"
              type="file"
              accept="application/pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              disabled={isLoading}
            />
            {files.aadhaarDocument && (
              <p className="file-info">
                Selected: {files.aadhaarDocument.name}
              </p>
            )}
            {fileErrors.aadhaarDocument && (
              <p className="error-message">{fileErrors.aadhaarDocument}</p>
            )}
          </div>
        </fieldset>

        {/* Error Messages */}
        {error && !isDuplicateError && (
          <div className="alert alert-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {isDuplicateError && (
          <div className="alert alert-warning">
            <strong>Notice:</strong> Your KYC submission is already being
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
            {isLoading ? "Submitting KYC..." : "Submit KYC"}
          </button>

          <button
            type="button"
            onClick={resetForm}
            disabled={isLoading}
            className="btn btn-secondary"
          >
            Clear Form
          </button>
        </div>
      </form>
    </div>
  );
};

export default KycFormExample;
