import { api } from "./axios.js";
import { idempotentPost, idempotentPut } from "./idempotentApi.js";

export const unwrap = (res) => res?.data?.data ?? res?.data;

const shouldFallbackEndpoint = (err) => {
  const status = err?.response?.status;
  const message = String(
    err?.response?.data?.message || err?.message || "",
  ).toLowerCase();
  const missingEndpointMessage =
    message.includes("no static resource") ||
    message.includes("nohandlerfound") ||
    message.includes("not found");

  return (
    !status || status === 404 || status === 405 || missingEndpointMessage
  );
};

// ---------------- CUSTOMER API ----------------
export const customerApi = {
  createProfile: (payload) =>
    idempotentPost("/customers/profile", payload, {
      operationId: "customerCreateProfile",
    }),
  getMyProfile: () => api.get("/customers/profile"),
  updateMyProfile: (payload) =>
    idempotentPost("/customers/profile", payload, {
      operationId: "customerUpdateProfile",
    }),
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
    return idempotentPost("/kyc/submit", formData, {
      operationId: "kycSubmit",
      config: {
        headers: { "Content-Type": "multipart/form-data" },
      },
    });
  },
  getMyKyc: () => api.get("/kyc/me"),

  // Officer/Admin actions
  getByStatus: async (status) => {
    try {
      return await api.get("/officer/kyc", { params: { status } });
    } catch (err) {
      if (!shouldFallbackEndpoint(err)) throw err;
      // Fallback for environments still exposing admin KYC endpoint
      return api.get("/admin/kyc", { params: { status } });
    }
  },
  approve: async (kycId, remarks) => {
    try {
      return await idempotentPost(`/officer/kyc/${kycId}/approve`, { remarks }, {
        operationId: `kycApprove:${kycId}`,
      });
    } catch (err) {
      if (!shouldFallbackEndpoint(err)) throw err;
      return idempotentPost(
        `/admin/kyc/${kycId}/verify`,
        {
          status: "APPROVED",
          remarks,
        },
        {
          operationId: `kycVerifyApproved:${kycId}`,
        },
      );
    }
  },
  reject: async (kycId, remarks) => {
    try {
      return await idempotentPost(`/officer/kyc/${kycId}/reject`, { remarks }, {
        operationId: `kycReject:${kycId}`,
      });
    } catch (err) {
      if (!shouldFallbackEndpoint(err)) throw err;
      return idempotentPost(
        `/admin/kyc/${kycId}/verify`,
        {
          status: "REJECTED",
          remarks,
        },
        {
          operationId: `kycVerifyRejected:${kycId}`,
        },
      );
    }
  },
};

// ---------------- PRODUCT API ----------------
export const productApi = {
  getAll: () => api.get("/products"),
  getById: (productId) => api.get(`/products/${productId}`),
  create: (payload) =>
    idempotentPost("/products", payload, {
      operationId: "productCreate",
    }),
};

// ---------------- LOAN API ----------------
export const loanApi = {
  create: (payload) =>
    idempotentPost("/loans", payload, {
      operationId: "loanCreate",
    }),
  submit: (loanId) =>
    idempotentPost(`/loans/${loanId}/submit`, null, {
      operationId: `loanSubmit:${loanId}`,
    }),
  getMyLoans: () => api.get("/loans/my-loans"),
  getById: (loanId) => api.get(`/loans/${loanId}`),
  getByStatus: (status) => api.get(`/loans/status/${status}`),
  moveToReview: (loanId) =>
    idempotentPost(`/loans/${loanId}/review`, null, {
      operationId: `loanReview:${loanId}`,
    }),
  approve: (loanId, payload) =>
    idempotentPost(`/loans/${loanId}/approve`, payload, {
      operationId: `loanApprove:${loanId}`,
    }),
  reject: (loanId, reason) =>
    idempotentPost(`/loans/${loanId}/reject`, null, {
      operationId: `loanReject:${loanId}`,
      config: { params: { reason } },
    }),
  disburse: (loanId) =>
    idempotentPost(`/loans/${loanId}/disburse`, null, {
      operationId: `loanDisburse:${loanId}`,
    }),
};

// ---------------- REPAYMENT API ----------------
export const repaymentApi = {
  makePayment: (payload) =>
    idempotentPost("/repayments", payload, {
      operationId: "repaymentMakePayment",
    }),
  getByLoan: (loanId) => api.get(`/repayments/loan/${loanId}`),
  getSchedule: (loanId) => api.get(`/repayments/schedule/${loanId}`),
  markMissed: (loanId) =>
    idempotentPost(`/repayments/miss/${loanId}`, null, {
      operationId: `repaymentMarkMissed:${loanId}`,
    }),
};

// ---------------- FILE API ----------------
export const fileApi = {
  upload: (file, entityType, entityId, displayName) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("entityType", entityType);
    formData.append("entityId", entityId);
    if (displayName) {
      formData.append("displayName", displayName);
    }

    return api.post("/files/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  listByEntity: (entityType, entityId) =>
    api.get(`/files/entity/${entityType}/${entityId}`),
  deleteFile: (fileId) => api.delete(`/files/${fileId}`),
  downloadUrl: (fileId) => `${api.defaults.baseURL}/files/download/${fileId}`,
  download: async (fileId, fallbackName = "document.pdf") => {
    const res = await api.get(`/files/download/${fileId}`, {
      responseType: "blob",
    });
    const disposition = res?.headers?.["content-disposition"] || "";
    const match = disposition.match(/filename="?([^"]+)"?/i);
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
};

// ---------------- ADMIN API ----------------
export const adminApi = {
  getUsers: () => api.get("/admin/users"),
  toggleUserStatus: (userId, active) =>
    idempotentPut(`/admin/users/${userId}/status`, null, {
      operationId: `adminToggleUserStatus:${userId}:${active}`,
      config: { params: { active } },
    }),
  createOfficer: (payload) =>
    idempotentPost("/admin/users/officer", payload, {
      operationId: "adminCreateOfficer",
    }),
  getAuditByUser: (userId) => api.get(`/admin/audit/user/${userId}`),
  getAuditByEntity: (entityType, entityId) =>
    api.get(`/admin/audit/entity/${entityType}/${entityId}`),
};

// ---------------- AUTH PROFILE API ----------------
export const userApi = {
  getMe: () => api.get("/auth/me"),
};
