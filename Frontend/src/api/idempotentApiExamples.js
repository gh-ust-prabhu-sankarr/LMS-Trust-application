/**
 * Example: Using idempotency with existing APIs
 * This file demonstrates how to integrate idempotency with the current API structure
 */

import { idempotentPost } from "../api/idempotentApi.js";
import { api } from "../api/axios.js";

/**
 * Updated Customer API with idempotency
 */
export const customerApiIdempotent = {
  // Profile creation is now idempotent
  createProfile: (payload) =>
    idempotentPost("/customers/profile", payload, {
      operationId: "createCustomerProfile",
    }),

  // Regular GET requests remain unchanged
  getMyProfile: () => api.get("/customers/profile"),

  // Update uses idempotent POST (matches backend implementation)
  updateMyProfile: (payload) =>
    idempotentPost("/customers/profile", payload, {
      operationId: "updateCustomerProfile",
    }),

  getById: (customerId) => api.get(`/customers/${customerId}`),
};

/**
 * Updated KYC API with idempotency
 */
export const kycApiIdempotent = {
  // KYC submission is idempotent
  submit: (payload, panDocument, aadhaarDocument) => {
    const formData = new FormData();
    formData.append("fullName", payload.fullName ?? "");
    formData.append("dob", payload.dob ?? "");
    formData.append("panNumber", payload.panNumber ?? "");
    formData.append("aadhaarNumber", payload.aadhaarNumber ?? "");
    formData.append("panDocument", panDocument);
    formData.append("aadhaarDocument", aadhaarDocument);

    return idempotentPost("/kyc/submit", formData, {
      operationId: "submitKyc",
      config: {
        headers: { "Content-Type": "multipart/form-data" },
      },
    });
  },

  getMyKyc: () => api.get("/kyc/me"),

  getByStatus: (status) => api.get("/officer/kyc", { params: { status } }),

  // Admin actions are also idempotent
  approve: (kycId, remarks) =>
    idempotentPost(
      `/officer/kyc/${kycId}/approve`,
      { remarks },
      {
        operationId: `approveKyc_${kycId}`,
      },
    ),

  reject: (kycId, remarks) =>
    idempotentPost(
      `/officer/kyc/${kycId}/reject`,
      { remarks },
      {
        operationId: `rejectKyc_${kycId}`,
      },
    ),
};

/**
 * Updated Loan API with idempotency
 */
export const loanApiIdempotent = {
  // Loan creation is idempotent
  create: (payload) =>
    idempotentPost("/loans", payload, {
      operationId: "createLoan",
    }),

  // Loan submission is idempotent
  submit: (loanId) =>
    idempotentPost(
      `/loans/${loanId}/submit`,
      {},
      {
        operationId: `submitLoan_${loanId}`,
      },
    ),

  getMyLoans: () => api.get("/loans/my-loans"),
  getById: (loanId) => api.get(`/loans/${loanId}`),
  getByStatus: (status) => api.get(`/loans/status/${status}`),

  // Review request is idempotent
  moveToReview: (loanId) =>
    idempotentPost(
      `/loans/${loanId}/review`,
      {},
      {
        operationId: `moveToReview_${loanId}`,
      },
    ),

  // Approval is idempotent
  approve: (loanId, payload) =>
    idempotentPost(`/loans/${loanId}/approve`, payload, {
      operationId: `approveLoan_${loanId}`,
    }),

  // Rejection is idempotent
  reject: (loanId, reason) =>
    idempotentPost(
      `/loans/${loanId}/reject`,
      { reason },
      {
        operationId: `rejectLoan_${loanId}`,
      },
    ),

  // Disbursement is idempotent
  disburse: (loanId) =>
    idempotentPost(
      `/loans/${loanId}/disburse`,
      {},
      {
        operationId: `disburseLoan_${loanId}`,
      },
    ),
};

/**
 * Updated Repayment API with idempotency
 */
export const repaymentApiIdempotent = {
  // Payment is idempotent
  makePayment: (payload) =>
    idempotentPost("/repayments", payload, {
      operationId: "makeRepayment",
    }),

  getByLoan: (loanId) => api.get(`/repayments/loan/${loanId}`),
  getSchedule: (loanId) => api.get(`/repayments/schedule/${loanId}`),

  // Mark missed is idempotent
  markMissed: (loanId) =>
    idempotentPost(
      `/repayments/miss/${loanId}`,
      {},
      {
        operationId: `markMissed_${loanId}`,
      },
    ),
};

/**
 * Updated Auth API with idempotency
 */
export const authApiIdempotent = {
  login: (payload) =>
    idempotentPost("/auth/login", payload, {
      operationId: "login",
    }),

  register: (payload) =>
    idempotentPost("/auth/signup", payload, {
      operationId: "register",
    }),

  requestOtp: (payload) =>
    idempotentPost("/auth/password-reset", payload, {
      operationId: "requestPasswordReset",
    }),

  verifyOtp: (payload) =>
    idempotentPost("/auth/verify-otp", payload, {
      operationId: "verifyOtp",
    }),

  resetPassword: (payload) =>
    idempotentPost("/auth/reset-password", payload, {
      operationId: "resetPassword",
    }),
};
