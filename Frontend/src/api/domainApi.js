import { api } from "./axios.js";

// ✅ ADD THIS (so AdminDashboard can import it)
export const unwrap = (res) => res?.data?.data ?? res?.data;

// ---------------- CUSTOMER API ----------------
export const customerApi = {
  createProfile: (payload) => api.post("/customers/profile", payload),
  getMyProfile: () => api.get("/customers/profile"),

  // ✅ BACKEND HAS NO PUT -> use POST
  updateMyProfile: (payload) => api.post("/customers/profile", payload),

  getById: (customerId) => api.get(`/customers/${customerId}`),

  submitMockKyc: (payload) => api.post("/kyc/mock/submit", payload),
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
  getMyLoans: () => api.get("/loans/my-loans"),
  getById: (loanId) => api.get(`/loans/${loanId}`),
  getByStatus: (status) => api.get(`/loans/status/${status}`),
  moveToReview: (loanId) => api.post(`/loans/${loanId}/review`),
  approve: (loanId, payload) => api.post(`/loans/${loanId}/approve`, payload),
  reject: (loanId, reason) => api.post(`/loans/${loanId}/reject`, null, { params: { reason } }),
  disburse: (loanId) => api.post(`/loans/${loanId}/disburse`),
};

// ---------------- REPAYMENT API ----------------
export const repaymentApi = {
  makePayment: (payload) => api.post("/repayments", payload),
  getByLoan: (loanId) => api.get(`/repayments/loan/${loanId}`),
  getSchedule: (loanId) => api.get(`/repayments/schedule/${loanId}`),
};

// ---------------- FILE API ----------------
export const fileApi = {
  upload: (file, entityType, entityId) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("entityType", entityType);
    formData.append("entityId", entityId);

    return api.post("/files/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  listByEntity: (entityType, entityId) => api.get(`/files/entity/${entityType}/${entityId}`),
  deleteFile: (fileId) => api.delete(`/files/${fileId}`),
  downloadUrl: (fileId) => `${api.defaults.baseURL}/files/download/${fileId}`,
};

// ---------------- ADMIN API ----------------
export const adminApi = {
  getUsers: () => api.get("/admin/users"),
  toggleUserStatus: (userId, active) => api.put(`/admin/users/${userId}/status`, null, { params: { active } }),
  createOfficer: (payload) => api.post("/admin/users/officer", payload),
  getAuditByUser: (userId) => api.get(`/admin/audit/user/${userId}`),
  getAuditByEntity: (entityType, entityId) => api.get(`/admin/audit/entity/${entityType}/${entityId}`),
};
