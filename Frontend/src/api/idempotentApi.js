/**
 * Idempotent API wrapper
 * Provides methods to make idempotent API requests with duplicate prevention
 */

import { api } from "./axios.js";
import {
  generateIdempotencyKey,
  trackRequest,
  markRequestCompleted,
  markRequestFailed,
  isRequestPending,
} from "../utils/idempotency.js";

const IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";

/**
 * Make an idempotent POST request
 * @param {string} url - API endpoint URL
 * @param {Object} data - Request payload
 * @param {Object} options - Additional options
 * @param {string} options.operationId - Unique operation identifier (for duplicate prevention)
 * @param {boolean} options.required - Whether idempotency key is required (default: true)
 * @param {Object} options.config - Additional axios config
 * @returns {Promise<Object>} Response data
 */
export const idempotentPost = async (url, data, options = {}) => {
  const { operationId, required = true, config = {} } = options;

  // Generate idempotency key
  const idempotencyKey = generateIdempotencyKey();

  // Track the request
  trackRequest(idempotencyKey, operationId || url, {
    method: "POST",
    url,
    dataHash: hashData(data),
  });

  try {
    // Make the request with idempotency key header
    const response = await api.post(url, data, {
      headers: {
        ...(config.headers || {}),
        ...(required ? { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } : {}),
      },
      ...config,
    });

    // Mark as completed
    markRequestCompleted(idempotencyKey, response.data);

    return response;
  } catch (error) {
    // Mark as failed
    markRequestFailed(idempotencyKey, error);

    throw error;
  }
};

/**
 * Make an idempotent PUT request
 * @param {string} url - API endpoint URL
 * @param {Object} data - Request payload
 * @param {Object} options - Additional options (see idempotentPost)
 * @returns {Promise<Object>} Response data
 */
export const idempotentPut = async (url, data, options = {}) => {
  const { operationId, required = true, config = {} } = options;

  const idempotencyKey = generateIdempotencyKey();

  trackRequest(idempotencyKey, operationId || url, {
    method: "PUT",
    url,
    dataHash: hashData(data),
  });

  try {
    const response = await api.put(url, data, {
      headers: {
        ...(config.headers || {}),
        ...(required ? { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } : {}),
      },
      ...config,
    });

    markRequestCompleted(idempotencyKey, response.data);

    return response;
  } catch (error) {
    markRequestFailed(idempotencyKey, error);
    throw error;
  }
};

/**
 * Make an idempotent PATCH request
 * @param {string} url - API endpoint URL
 * @param {Object} data - Request payload
 * @param {Object} options - Additional options (see idempotentPost)
 * @returns {Promise<Object>} Response data
 */
export const idempotentPatch = async (url, data, options = {}) => {
  const { operationId, required = true, config = {} } = options;

  const idempotencyKey = generateIdempotencyKey();

  trackRequest(idempotencyKey, operationId || url, {
    method: "PATCH",
    url,
    dataHash: hashData(data),
  });

  try {
    const response = await api.patch(url, data, {
      headers: {
        ...(config.headers || {}),
        ...(required ? { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } : {}),
      },
      ...config,
    });

    markRequestCompleted(idempotencyKey, response.data);

    return response;
  } catch (error) {
    markRequestFailed(idempotencyKey, error);
    throw error;
  }
};

/**
 * Make an idempotent DELETE request
 * @param {string} url - API endpoint URL
 * @param {Object} options - Additional options (see idempotentPost)
 * @returns {Promise<Object>} Response data
 */
export const idempotentDelete = async (url, options = {}) => {
  const { operationId, required = true, config = {} } = options;

  const idempotencyKey = generateIdempotencyKey();

  trackRequest(idempotencyKey, operationId || url, {
    method: "DELETE",
    url,
  });

  try {
    const response = await api.delete(url, {
      headers: {
        ...(config.headers || {}),
        ...(required ? { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } : {}),
      },
      ...config,
    });

    markRequestCompleted(idempotencyKey, response.data);

    return response;
  } catch (error) {
    markRequestFailed(idempotencyKey, error);
    throw error;
  }
};

/**
 * Prevent duplicate submission within a specific operation
 * Checks if a similar request is already pending
 * @param {string} operationId - Unique operation identifier
 * @param {Object} data - Request payload to compare
 * @returns {Object} { isDuplicate: boolean, existingRequest?: Object }
 */
export const checkForDuplicateSubmission = (operationId, data) => {
  // This is a client-side check - the backend will also validate
  // This helps prevent unnecessary network requests

  const dataHash = hashData(data);
  const records = getAllTrackedRecords();

  for (const record of Object.values(records)) {
    if (
      record.operationId === operationId &&
      record.dataHash === dataHash &&
      isRequestPending(record.idempotencyKey)
    ) {
      return {
        isDuplicate: true,
        existingRequest: record,
      };
    }
  }

  return { isDuplicate: false };
};

/**
 * Get all tracked records
 * @private
 * @returns {Object} Tracked records
 */
function getAllTrackedRecords() {
  try {
    const stored = localStorage.getItem("lms_idempotency_keys");
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Error reading idempotency records:", error);
    return {};
  }
}

/**
 * Simple hash function for data comparison
 * @private
 * @param {Object} data - Data to hash
 * @returns {string} Hash string
 */
function hashData(data) {
  try {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  } catch (error) {
    console.error("Error hashing data:", error);
    return "";
  }
}
