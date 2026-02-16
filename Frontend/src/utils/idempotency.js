/**
 * Idempotency utility for frontend
 * Handles idempotency key generation and management to prevent duplicate requests
 */

// Storage key for idempotency records
const IDEMPOTENCY_STORAGE_KEY = "lms_idempotency_keys";
const IDEMPOTENCY_TTL = 3 * 60 * 1000; // 3 minutes (matches backend TTL)
const REQUEST_TIMEOUT = 30000; // 30 seconds max wait for pending request

/**
 * Request tracking states
 */
export const RequestStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
};

/**
 * Generate a unique idempotency key
 * @returns {string} A unique UUID-based idempotency key
 */
export const generateIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
};

/**
 * Get or create an idempotency key for a specific operation
 * @param {string} operationId - Unique identifier for the operation (e.g., "createLoan", "submitKYC")
 * @returns {string} Idempotency key
 */
export const getOrCreateIdempotencyKey = (operationId) => {
  const storage = getIdempotencyStorage();
  const key = `${operationId}_${Date.now()}`;

  if (!storage[key]) {
    storage[key] = {
      idempotencyKey: generateIdempotencyKey(),
      operationId,
      timestamp: Date.now(),
      status: RequestStatus.PENDING,
      response: null,
      error: null,
    };
    saveIdempotencyStorage(storage);
  }

  return storage[key].idempotencyKey;
};

/**
 * Track a request with idempotency key
 * @param {string} idempotencyKey - The idempotency key
 * @param {string} operationId - Operation identifier
 * @param {Object} requestConfig - Request configuration details
 */
export const trackRequest = (
  idempotencyKey,
  operationId,
  requestConfig = {},
) => {
  const storage = getIdempotencyStorage();

  storage[idempotencyKey] = {
    idempotencyKey,
    operationId,
    timestamp: Date.now(),
    status: RequestStatus.PENDING,
    response: null,
    error: null,
    ...requestConfig,
  };

  saveIdempotencyStorage(storage);
};

/**
 * Mark a request as completed
 * @param {string} idempotencyKey - The idempotency key
 * @param {Object} response - Response data
 */
export const markRequestCompleted = (idempotencyKey, response) => {
  const storage = getIdempotencyStorage();

  if (storage[idempotencyKey]) {
    storage[idempotencyKey].status = RequestStatus.COMPLETED;
    storage[idempotencyKey].response = response;
    storage[idempotencyKey].completedAt = Date.now();
    saveIdempotencyStorage(storage);
  }
};

/**
 * Mark a request as failed
 * @param {string} idempotencyKey - The idempotency key
 * @param {Object} error - Error object
 */
export const markRequestFailed = (idempotencyKey, error) => {
  const storage = getIdempotencyStorage();

  if (storage[idempotencyKey]) {
    storage[idempotencyKey].status = RequestStatus.FAILED;
    storage[idempotencyKey].error = {
      message: error?.message || "Unknown error",
      code: error?.code,
      statusCode: error?.response?.status,
    };
    storage[idempotencyKey].failedAt = Date.now();
    saveIdempotencyStorage(storage);
  }
};

/**
 * Get the status of a tracked request
 * @param {string} idempotencyKey - The idempotency key
 * @returns {Object} Request status information
 */
export const getRequestStatus = (idempotencyKey) => {
  const storage = getIdempotencyStorage();
  return storage[idempotencyKey] || null;
};

/**
 * Check if a request is currently pending
 * @param {string} idempotencyKey - The idempotency key
 * @returns {boolean} True if request is pending
 */
export const isRequestPending = (idempotencyKey) => {
  const status = getRequestStatus(idempotencyKey);
  return status?.status === RequestStatus.PENDING;
};

/**
 * Wait for a pending request to complete or fail
 * @param {string} idempotencyKey - The idempotency key
 * @param {number} timeout - Maximum time to wait in ms
 * @returns {Promise<Object>} Request status
 */
export const waitForRequest = (idempotencyKey, timeout = REQUEST_TIMEOUT) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const interval = 100; // Check every 100ms

    const checkStatus = () => {
      const status = getRequestStatus(idempotencyKey);

      if (!status) {
        reject(new Error("Request not found"));
        return;
      }

      if (status.status !== RequestStatus.PENDING) {
        resolve(status);
        return;
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error("Request timeout"));
        return;
      }

      setTimeout(checkStatus, interval);
    };

    checkStatus();
  });
};

/**
 * Clean up expired idempotency records
 */
export const cleanupExpiredRecords = () => {
  const storage = getIdempotencyStorage();
  const now = Date.now();
  let cleaned = false;

  Object.keys(storage).forEach((key) => {
    const record = storage[key];

    // Remove completed or failed records older than TTL
    if (
      (record.status === RequestStatus.COMPLETED ||
        record.status === RequestStatus.FAILED) &&
      now - record.timestamp > IDEMPOTENCY_TTL
    ) {
      delete storage[key];
      cleaned = true;
    }
  });

  if (cleaned) {
    saveIdempotencyStorage(storage);
  }
};

/**
 * Get all tracked idempotency records
 * @returns {Object} All stored records
 */
export const getAllRecords = () => {
  return getIdempotencyStorage();
};

/**
 * Clear all idempotency records
 */
export const clearAllRecords = () => {
  localStorage.removeItem(IDEMPOTENCY_STORAGE_KEY);
};

/**
 * Get idempotency storage from localStorage
 * @private
 * @returns {Object} Stored records
 */
function getIdempotencyStorage() {
  try {
    const stored = localStorage.getItem(IDEMPOTENCY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Error reading idempotency storage:", error);
    return {};
  }
}

/**
 * Save idempotency storage to localStorage
 * @private
 */
function saveIdempotencyStorage(storage) {
  try {
    localStorage.setItem(IDEMPOTENCY_STORAGE_KEY, JSON.stringify(storage));
  } catch (error) {
    console.error("Error saving idempotency storage:", error);
  }
}
