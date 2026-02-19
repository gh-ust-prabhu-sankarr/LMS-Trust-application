import { api } from "./axios.js";

export const unwrap = (res) => res?.data?.data ?? res?.data;

const shouldFallbackEndpoint = (err) => {
  const status = err?.response?.status;
  const message = String(err?.response?.data?.message || err?.message || "").toLowerCase();
  const missingEndpointMessage =
    message.includes("no static resource") ||
    message.includes("nohandlerfound") ||
    message.includes("not found");

  return !status || status === 404 || status === 405 || missingEndpointMessage;
};

// ---------------- CUSTOMER API ----------------
export const customerApi = {
  createProfile: (payload) => api.post("/customers/profile", payload),
  getMyProfile: () => api.get("/customers/profile"),

  // ✅ BACKEND HAS NO PUT -> use POST
  updateMyProfile: (payload) => api.post("/customers/profile", payload),

  getById: (customerId) => api.get(`/customers/${customerId}`),
};

// ---------------- KYC API ----------------
export const kycApi = {
  // Customer actions
  submit: (payload, panDocument, aadhaarDocument) => {
    const formData = new FormData();
    formData.append("fullName", payload.fullName ?? "");
    formData.append("dob", payload.dob ?? "");
    formData.append("panNumber", payload.panNumber ?? "");
    formData.append("aadhaarNumber", payload.aadhaarNumber ?? "");
    formData.append("panDocument", panDocument);
    formData.append("aadhaarDocument", aadhaarDocument);

    return api.post("/kyc/submit", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  getMyKyc: () => api.get("/kyc/me"),

  // Officer/Admin actions
  getByStatus: async (status) => {
    try {
      return await api.get("/officer/kyc", { params: { status } });
    } catch (err) {
      if (!shouldFallbackEndpoint(err)) throw err;
      return api.get("/admin/kyc", { params: { status } });
    }
  },

  approve: async (kycId, remarks) => {
    try {
      return await api.post(`/officer/kyc/${kycId}/approve`, { remarks });
    } catch (err) {
      if (!shouldFallbackEndpoint(err)) throw err;
      return api.post(`/admin/kyc/${kycId}/verify`, { status: "APPROVED", remarks });
    }
  },

  reject: async (kycId, remarks) => {
    try {
      return await api.post(`/officer/kyc/${kycId}/reject`, { remarks });
    } catch (err) {
      if (!shouldFallbackEndpoint(err)) throw err;
      return api.post(`/admin/kyc/${kycId}/verify`, { status: "REJECTED", remarks });
    }
  },
};

// ---------------- PRODUCT API ----------------
export const productApi = {
  getAll: () => api.get("/products"),
  getById: (productId) => api.get(`/products/${productId}`),
  create: (payload) => api.post("/products", payload),
};

// ---------------- LOAN API ----------------
export const loanApi = {
  create: (payload) => api.post("/loans", payload),
  submit: (loanId) => api.post(`/loans/${loanId}/submit`),
  acceptAgreement: (loanId, payload) => api.post(`/loans/${loanId}/agreement/accept`, payload),
  submitBankDetails: (loanId, payload) => api.post(`/loans/${loanId}/bank-details`, payload),
  verifyBankDetails: (loanId, payload) => api.post(`/loans/${loanId}/bank-details/verify`, payload),
  getMyLoans: () => api.get("/loans/my-loans"),
  getById: (loanId) => api.get(`/loans/${loanId}`),
  getByStatus: (status) => api.get(`/loans/status/${status}`),
  moveToReview: (loanId) => api.post(`/loans/${loanId}/review`),
  approve: (loanId, payload) => api.post(`/loans/${loanId}/approve`, payload),
  reject: async (loanId, reason) => {
    try {
      return await api.post(`/loans/${loanId}/reject`, null, { params: { reason } });
    } catch (err) {
      if (!shouldFallbackEndpoint(err)) throw err;
      return api.post(`/loans/${loanId}/reject`, { reason });
    }
  },
  disburse: (loanId) => api.post(`/loans/${loanId}/disburse`),
};

// ---------------- REPAYMENT API ----------------
export const repaymentApi = {
  // mock/manual payment (if you still want it)
  makePayment: (payload) => api.post("/repayments", payload),

  // ✅ Stripe checkout session
  createStripeCheckoutSession: (payload) =>
    api.post("/repayments/stripe/checkout-session", payload),

  // ✅ FIXED: backend expects JSON body { sessionId }
  confirmStripePayment: (sessionId) =>
  api.post("/repayments/stripe/confirm", { sessionId }),

  getByLoan: (loanId) => api.get(`/repayments/loan/${loanId}`),
  getAll: () => api.get("/repayments"),
  getSchedule: (loanId) => api.get(`/repayments/schedule/${loanId}`),
  markMissed: (loanId) => api.post(`/repayments/miss/${loanId}`),
};

// ---------------- FILE API ----------------
export const fileApi = {
  upload: (file, entityType, entityId, displayName) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("entityType", entityType);
    formData.append("entityId", entityId);
    if (displayName) formData.append("displayName", displayName);

    return api.post("/files/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  listByEntity: (entityType, entityId) => api.get(`/files/entity/${entityType}/${entityId}`),
  deleteFile: (fileId) => api.delete(`/files/${fileId}`),
  downloadUrl: (fileId) => `${api.defaults.baseURL}/files/download/${fileId}`,

  download: async (fileId, fallbackName = "document.pdf") => {
    const res = await api.get(`/files/download/${fileId}`, { responseType: "blob" });
    const disposition = res?.headers?.["content-disposition"] || "";
    const match = disposition.match(/filename=\"?([^"]+)\"?/i);
    const filename = match?.[1] || fallbackName;

    const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
  },

  getPreviewSource: async (fileId) => {
    const res = await api.get(`/files/download/${fileId}`, { responseType: "blob" });
    const disposition = res?.headers?.["content-disposition"] || "";
    const contentType = String(res?.headers?.["content-type"] || "").toLowerCase();
    const filenameMatch = disposition.match(/filename=\"?([^"]+)\"?/i);
    const fileName = filenameMatch?.[1] || "document";
    const inferredType =
      contentType && contentType !== "application/octet-stream"
        ? contentType
        : fileName.toLowerCase().endsWith(".pdf")
        ? "application/pdf"
        : "application/octet-stream";
    const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: inferredType }));
    return { blobUrl, contentType: inferredType, fileName };
  },

  openInNewTab: async (fileId, targetWindow = null) => {
    const { blobUrl } = await fileApi.getPreviewSource(fileId);
    if (targetWindow && !targetWindow.closed) {
      targetWindow.location.replace(blobUrl);
    } else {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    }
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
  },
};

// ---------------- ADMIN API ----------------
export const adminApi = {
  getUsers: () => api.get("/admin/users"),
  toggleUserStatus: (userId, active) => api.put(`/admin/users/${userId}/status`, null, { params: { active } }),
  createOfficer: (payload) => api.post("/admin/users/officer", payload),
  getAuditLogs: (params) => api.get("/admin/audit", { params }),
  getAuditByUser: (userId) => api.get(`/admin/audit/user/${userId}`),
  getAuditByEntity: (entityType, entityId) => api.get(`/admin/audit/entity/${entityType}/${entityId}`),
};

// ---------------- AUTH PROFILE API ----------------
export const userApi = {
  getMe: () => api.get("/auth/me"),
};
