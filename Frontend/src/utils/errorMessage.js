const GENERIC_AXIOS_STATUS_ERROR = /^Request failed with status code \d{3}$/i;

const STATUS_FALLBACKS = {
  400: "Invalid data entered. Please correct the highlighted fields and try again.",
  401: "Your session has expired. Please log in again.",
  403: "You do not have permission to perform this action.",
  404: "Requested resource was not found.",
  409: "This action conflicts with existing data.",
  422: "Submitted data is invalid. Please review and try again.",
  429: "Too many requests. Please wait and try again.",
  500: "Server error occurred. Please try again later.",
  502: "Service is temporarily unavailable. Please try again in a moment.",
  503: "Service is currently unavailable. Please try again later.",
  504: "Request timed out while contacting the server. Please try again.",
};

const toLabel = (fieldName) =>
  String(fieldName || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

const asString = (value) => (typeof value === "string" ? value.trim() : "");

const getValidationMessageFromObject = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "";

  const blockedKeys = new Set(["message", "error", "errorCode", "status", "path", "timestamp"]);
  const entries = Object.entries(payload)
    .filter(([key, val]) => !blockedKeys.has(key) && typeof val === "string" && val.trim())
    .map(([key, val]) => `${toLabel(key)}: ${val.trim()}`);

  if (!entries.length) return "";
  if (entries.length === 1) return entries[0];
  return `Invalid data entered. ${entries.join(" ")}`;
};

export const extractErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  if (!error) return fallback;

  if (error?.code === "ECONNABORTED") {
    return "Request timed out. Please check your connection and try again.";
  }

  const status = Number(error?.response?.status);
  const data = error?.response?.data;

  const dataString = asString(typeof data === "string" ? data : "");
  if (dataString) return dataString;

  const messageFromData = asString(data?.message);
  if (messageFromData) return messageFromData;

  const errorFromData = asString(data?.error);
  if (errorFromData) return errorFromData;

  const errorsArray = Array.isArray(data?.errors) ? data.errors : [];
  const firstArrayMessage = errorsArray
    .map((item) => asString(item?.message || item?.defaultMessage || item))
    .find(Boolean);
  if (firstArrayMessage) return firstArrayMessage;

  const validationMessage = getValidationMessageFromObject(data);
  if (validationMessage) return validationMessage;

  const directMessage = asString(error?.message);
  if (directMessage && !GENERIC_AXIOS_STATUS_ERROR.test(directMessage)) return directMessage;

  if (!error?.response) {
    return "Unable to reach server. Please check your internet connection.";
  }

  return STATUS_FALLBACKS[status] || fallback;
};

export const normalizeAxiosError = (error) => {
  if (!error) return error;
  const normalizedMessage = extractErrorMessage(error);
  error.friendlyMessage = normalizedMessage;

  if (error?.response?.data && typeof error.response.data === "object" && !Array.isArray(error.response.data)) {
    if (!asString(error.response.data.message)) {
      error.response.data.message = normalizedMessage;
    }
  }

  if (!asString(error.message) || GENERIC_AXIOS_STATUS_ERROR.test(error.message)) {
    error.message = normalizedMessage;
  }

  return error;
};
